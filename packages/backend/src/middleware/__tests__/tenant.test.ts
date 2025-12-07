import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { tenantMiddleware } from '../tenant.js'
import { prisma } from '../../lib/prisma.js'
import * as redis from '../../lib/redis.js'

// Mock dependencies
vi.mock('../../lib/prisma.js')
vi.mock('../../lib/redis.js')

describe('Tenant Middleware', () => {
  let mockRequest: Partial<FastifyRequest>
  let mockReply: Partial<FastifyReply>

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      url: '/api/test',
      headers: {},
      log: {
        warn: vi.fn(),
      } as any,
    }

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    }
  })

  it('should skip middleware for /health route', async () => {
    mockRequest.url = '/health'
    
    await tenantMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(mockReply.status).not.toHaveBeenCalled()
    expect(mockReply.send).not.toHaveBeenCalled()
  })

  it('should skip middleware for /docs route', async () => {
    mockRequest.url = '/docs'
    
    await tenantMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(mockReply.status).not.toHaveBeenCalled()
    expect(mockReply.send).not.toHaveBeenCalled()
  })

  it('should skip middleware for / route', async () => {
    mockRequest.url = '/'
    
    await tenantMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(mockReply.status).not.toHaveBeenCalled()
    expect(mockReply.send).not.toHaveBeenCalled()
  })

  it('should return 404 when x-tenant-slug header is missing', async () => {
    mockRequest.url = '/api/test'
    mockRequest.headers = {}

    await tenantMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(mockReply.status).toHaveBeenCalledWith(404)
    expect(mockReply.send).toHaveBeenCalledWith({
      error: 'Tenant not found',
      message: 'Missing x-tenant-slug header',
    })
  })

  it('should return 404 when tenant is not found in database', async () => {
    mockRequest.url = '/api/test'
    mockRequest.headers = { 'x-tenant-slug': 'invalid-tenant' }

    vi.mocked(redis.getCachedTenant).mockResolvedValue(null)
    vi.mocked(prisma.barbershop.findUnique).mockResolvedValue(null)

    await tenantMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(mockReply.status).toHaveBeenCalledWith(404)
    expect(mockReply.send).toHaveBeenCalledWith({
      error: 'Tenant not found',
      message: 'Barbershop with slug "invalid-tenant" does not exist',
    })
  })

  it('should return 404 when tenant is inactive', async () => {
    mockRequest.url = '/api/test'
    mockRequest.headers = { 'x-tenant-slug': 'inactive-tenant' }

    vi.mocked(redis.getCachedTenant).mockResolvedValue(null)
    vi.mocked(prisma.barbershop.findUnique).mockResolvedValue({
      id: 'tenant-id',
      isActive: false,
    } as any)

    await tenantMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(mockReply.status).toHaveBeenCalledWith(404)
    expect(mockReply.send).toHaveBeenCalledWith({
      error: 'Tenant not found',
      message: 'Barbershop with slug "inactive-tenant" is inactive',
    })
  })

  it('should use cached tenant when available', async () => {
    mockRequest.url = '/api/test'
    mockRequest.headers = { 'x-tenant-slug': 'valid-tenant' }

    vi.mocked(redis.getCachedTenant).mockResolvedValue('cached-tenant-id')

    await tenantMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(prisma.barbershop.findUnique).not.toHaveBeenCalled()
    expect(mockRequest.tenantId).toBe('cached-tenant-id')
    expect(mockRequest.tenantSlug).toBe('valid-tenant')
    expect(mockReply.status).not.toHaveBeenCalled()
  })

  it('should fetch tenant from database and cache it', async () => {
    mockRequest.url = '/api/test'
    mockRequest.headers = { 'x-tenant-slug': 'valid-tenant' }

    vi.mocked(redis.getCachedTenant).mockResolvedValue(null)
    vi.mocked(prisma.barbershop.findUnique).mockResolvedValue({
      id: 'tenant-id',
      isActive: true,
    } as any)
    vi.mocked(redis.cacheTenant).mockResolvedValue()

    await tenantMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(prisma.barbershop.findUnique).toHaveBeenCalledWith({
      where: { slug: 'valid-tenant' },
      select: { id: true, isActive: true },
    })
    expect(redis.cacheTenant).toHaveBeenCalledWith('valid-tenant', 'tenant-id')
    expect(mockRequest.tenantId).toBe('tenant-id')
    expect(mockRequest.tenantSlug).toBe('valid-tenant')
    expect(mockReply.status).not.toHaveBeenCalled()
  })

  it('should handle query string in URL', async () => {
    mockRequest.url = '/api/test?foo=bar'
    mockRequest.headers = { 'x-tenant-slug': 'valid-tenant' }

    vi.mocked(redis.getCachedTenant).mockResolvedValue('tenant-id')

    await tenantMiddleware(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    )

    expect(mockRequest.tenantId).toBe('tenant-id')
    expect(mockRequest.tenantSlug).toBe('valid-tenant')
  })
})
