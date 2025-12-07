import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { rateLimitMiddleware } from '../rateLimit.js'
import { ipRatelimit, tenantRatelimit } from '../../lib/redis.js'

// Mock dependencies
vi.mock('../../lib/redis.js')

describe('Rate Limit Middleware', () => {
  let mockRequest: Partial<FastifyRequest>
  let mockReply: Partial<FastifyReply>

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      url: '/api/test',
      headers: {},
      ip: '127.0.0.1',
    }

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
    }
  })

  it('should skip middleware for /health route', async () => {
    mockRequest.url = '/health'
    
    await rateLimitMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(mockReply.status).not.toHaveBeenCalled()
    expect(ipRatelimit.limit).not.toHaveBeenCalled()
  })

  it('should skip middleware for /docs route', async () => {
    mockRequest.url = '/docs'
    
    await rateLimitMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(mockReply.status).not.toHaveBeenCalled()
    expect(ipRatelimit.limit).not.toHaveBeenCalled()
  })

  it('should skip middleware for / route', async () => {
    mockRequest.url = '/'
    
    await rateLimitMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(mockReply.status).not.toHaveBeenCalled()
    expect(ipRatelimit.limit).not.toHaveBeenCalled()
  })

  it('should rate limit by IP and return 429 when limit exceeded', async () => {
    mockRequest.url = '/api/test'
    mockRequest.headers = {}
    mockRequest.ip = '127.0.0.1'

    vi.mocked(ipRatelimit.limit).mockResolvedValue({
      success: false,
      limit: 100,
      remaining: 0,
      reset: Date.now() + 60000,
    } as any)

    await rateLimitMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(ipRatelimit.limit).toHaveBeenCalledWith('127.0.0.1')
    expect(mockReply.status).toHaveBeenCalledWith(429)
    expect(mockReply.send).toHaveBeenCalledWith({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    })
    expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '100')
    expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '0')
  })

  it('should use x-forwarded-for header for IP detection', async () => {
    mockRequest.url = '/api/test'
    mockRequest.headers = {
      'x-forwarded-for': '192.168.1.1, 10.0.0.1',
    }
    mockRequest.ip = '127.0.0.1'

    vi.mocked(ipRatelimit.limit).mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    } as any)

    await rateLimitMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(ipRatelimit.limit).toHaveBeenCalledWith('192.168.1.1')
  })

  it('should use x-real-ip header when x-forwarded-for is not available', async () => {
    mockRequest.url = '/api/test'
    mockRequest.headers = {
      'x-real-ip': '10.0.0.1',
    }
    mockRequest.ip = '127.0.0.1'

    vi.mocked(ipRatelimit.limit).mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    } as any)

    await rateLimitMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(ipRatelimit.limit).toHaveBeenCalledWith('10.0.0.1')
  })

  it('should rate limit by tenant when tenantId is available', async () => {
    mockRequest.url = '/api/test'
    mockRequest.headers = {}
    mockRequest.ip = '127.0.0.1'
    mockRequest.tenantId = 'tenant-id'

    vi.mocked(ipRatelimit.limit).mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    } as any)

    vi.mocked(tenantRatelimit.limit).mockResolvedValue({
      success: true,
      limit: 1000,
      remaining: 999,
      reset: Date.now() + 60000,
    } as any)

    await rateLimitMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(ipRatelimit.limit).toHaveBeenCalledWith('127.0.0.1')
    expect(tenantRatelimit.limit).toHaveBeenCalledWith('tenant-id')
    expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '1000')
    expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '999')
  })

  it('should return 429 when tenant rate limit is exceeded', async () => {
    mockRequest.url = '/api/test'
    mockRequest.headers = {}
    mockRequest.ip = '127.0.0.1'
    mockRequest.tenantId = 'tenant-id'

    vi.mocked(ipRatelimit.limit).mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    } as any)

    vi.mocked(tenantRatelimit.limit).mockResolvedValue({
      success: false,
      limit: 1000,
      remaining: 0,
      reset: Date.now() + 60000,
    } as any)

    await rateLimitMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(mockReply.status).toHaveBeenCalledWith(429)
    expect(mockReply.send).toHaveBeenCalledWith({
      error: 'Too Many Requests',
      message: 'Tenant rate limit exceeded. Please try again later.',
    })
    expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '1000')
    expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '0')
  })

  it('should handle query string in URL', async () => {
    mockRequest.url = '/api/test?foo=bar'
    mockRequest.headers = {}
    mockRequest.ip = '127.0.0.1'

    vi.mocked(ipRatelimit.limit).mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    } as any)

    await rateLimitMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(ipRatelimit.limit).toHaveBeenCalled()
  })
})
