import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { rateLimitMiddleware } from '../rateLimit'

// Mock dependencies
vi.mock('../../lib/redis', () => ({
  ipRatelimit: {
    limit: vi.fn(),
  },
  tenantRatelimit: {
    limit: vi.fn(),
  },
}))

import { ipRatelimit, tenantRatelimit } from '../../lib/redis'

describe('rateLimitMiddleware', () => {
  let mockRequest: Partial<FastifyRequest>
  let mockReply: Partial<FastifyReply>
  let statusMock: ReturnType<typeof vi.fn>
  let sendMock: ReturnType<typeof vi.fn>
  let headerMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Setup mock reply
    statusMock = vi.fn().mockReturnThis()
    sendMock = vi.fn()
    headerMock = vi.fn().mockReturnThis()

    mockReply = {
      status: statusMock,
      send: sendMock,
      header: headerMock,
    }
  })

  describe('Public routes (should skip rate limiting)', () => {
    it('should allow /health without rate limiting', async () => {
      mockRequest = {
        url: '/health',
        headers: {},
        ip: '127.0.0.1',
      }

      await rateLimitMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(ipRatelimit.limit).not.toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('should allow / without rate limiting', async () => {
      mockRequest = {
        url: '/',
        headers: {},
        ip: '127.0.0.1',
      }

      await rateLimitMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(ipRatelimit.limit).not.toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('should allow /docs without rate limiting', async () => {
      mockRequest = {
        url: '/docs',
        headers: {},
        ip: '127.0.0.1',
      }

      await rateLimitMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(ipRatelimit.limit).not.toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('should allow /docs/static/swagger.css without rate limiting', async () => {
      mockRequest = {
        url: '/docs/static/swagger.css',
        headers: {},
        ip: '127.0.0.1',
      }

      await rateLimitMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(ipRatelimit.limit).not.toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('should allow /docs/json without rate limiting', async () => {
      mockRequest = {
        url: '/docs/json',
        headers: {},
        ip: '127.0.0.1',
      }

      await rateLimitMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(ipRatelimit.limit).not.toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('should allow /docs/ without rate limiting', async () => {
      mockRequest = {
        url: '/docs/',
        headers: {},
        ip: '127.0.0.1',
      }

      await rateLimitMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(ipRatelimit.limit).not.toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('should strip query string when checking public routes', async () => {
      mockRequest = {
        url: '/health?timestamp=123',
        headers: {},
        ip: '127.0.0.1',
      }

      await rateLimitMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(ipRatelimit.limit).not.toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })
  })

  describe('IP-based rate limiting', () => {
    it('should apply rate limiting and add headers when IP limit succeeds', async () => {
      vi.mocked(ipRatelimit.limit).mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })

      mockRequest = {
        url: '/api/professionals',
        headers: {},
        ip: '192.168.1.1',
      }

      await rateLimitMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(ipRatelimit.limit).toHaveBeenCalledWith('192.168.1.1')
      expect(headerMock).toHaveBeenCalledWith('X-RateLimit-Limit', '100')
      expect(headerMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '99')
      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('should return 429 when IP rate limit is exceeded', async () => {
      vi.mocked(ipRatelimit.limit).mockResolvedValue({
        success: false,
        limit: 100,
        remaining: 0,
        reset: Date.now() + 60000,
      })

      mockRequest = {
        url: '/api/professionals',
        headers: {},
        ip: '192.168.1.1',
      }

      await rateLimitMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(statusMock).toHaveBeenCalledWith(429)
      expect(sendMock).toHaveBeenCalledWith({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
      })
    })

    it('should use x-forwarded-for header for IP when available', async () => {
      vi.mocked(ipRatelimit.limit).mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })

      mockRequest = {
        url: '/api/professionals',
        headers: {
          'x-forwarded-for': '203.0.113.1, 192.168.1.1',
        },
        ip: '127.0.0.1',
      }

      await rateLimitMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(ipRatelimit.limit).toHaveBeenCalledWith('203.0.113.1')
    })

    it('should use x-real-ip header when x-forwarded-for is not available', async () => {
      vi.mocked(ipRatelimit.limit).mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })

      mockRequest = {
        url: '/api/professionals',
        headers: {
          'x-real-ip': '203.0.113.2',
        },
        ip: '127.0.0.1',
      }

      await rateLimitMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(ipRatelimit.limit).toHaveBeenCalledWith('203.0.113.2')
    })
  })

  describe('Tenant-based rate limiting', () => {
    it('should apply tenant rate limiting when tenantId is available', async () => {
      vi.mocked(ipRatelimit.limit).mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })
      vi.mocked(tenantRatelimit.limit).mockResolvedValue({
        success: true,
        limit: 1000,
        remaining: 999,
        reset: Date.now() + 60000,
      })

      mockRequest = {
        url: '/api/professionals',
        headers: {},
        ip: '192.168.1.1',
        tenantId: 'barbershop-1',
      }

      await rateLimitMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(tenantRatelimit.limit).toHaveBeenCalledWith('barbershop-1')
      expect(headerMock).toHaveBeenCalledWith('X-RateLimit-Limit', '1000')
      expect(headerMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '999')
      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('should return 429 when tenant rate limit is exceeded', async () => {
      vi.mocked(ipRatelimit.limit).mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })
      vi.mocked(tenantRatelimit.limit).mockResolvedValue({
        success: false,
        limit: 1000,
        remaining: 0,
        reset: Date.now() + 60000,
      })

      mockRequest = {
        url: '/api/professionals',
        headers: {},
        ip: '192.168.1.1',
        tenantId: 'barbershop-1',
      }

      await rateLimitMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(statusMock).toHaveBeenCalledWith(429)
      expect(sendMock).toHaveBeenCalledWith({
        error: 'Too Many Requests',
        message: 'Tenant rate limit exceeded. Please try again later.',
      })
    })
  })
})
