import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { tenantMiddleware } from '../tenant'

// Mock dependencies
vi.mock('../../lib/prisma', () => ({
  prisma: {
    barbershop: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('../../lib/redis', () => ({
  getCachedTenant: vi.fn(),
  cacheTenant: vi.fn(),
}))

import { prisma } from '../../lib/prisma'
import { getCachedTenant, cacheTenant } from '../../lib/redis'

describe('tenantMiddleware', () => {
  let mockRequest: Partial<FastifyRequest>
  let mockReply: Partial<FastifyReply>
  let statusMock: ReturnType<typeof vi.fn>
  let sendMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Setup mock reply
    statusMock = vi.fn().mockReturnThis()
    sendMock = vi.fn()

    mockReply = {
      status: statusMock,
      send: sendMock,
    }
  })

  describe('Public routes (should skip middleware)', () => {
    it('should allow /health without tenant header', async () => {
      mockRequest = {
        url: '/health',
        headers: {},
      }

      await tenantMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('should allow / without tenant header', async () => {
      mockRequest = {
        url: '/',
        headers: {},
      }

      await tenantMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('should allow /docs without tenant header', async () => {
      mockRequest = {
        url: '/docs',
        headers: {},
      }

      await tenantMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('should allow /docs/static/swagger.css without tenant header', async () => {
      mockRequest = {
        url: '/docs/static/swagger.css',
        headers: {},
      }

      await tenantMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('should allow /docs/json without tenant header', async () => {
      mockRequest = {
        url: '/docs/json',
        headers: {},
      }

      await tenantMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('should allow /docs/ without tenant header', async () => {
      mockRequest = {
        url: '/docs/',
        headers: {},
      }

      await tenantMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('should strip query string when checking public routes', async () => {
      mockRequest = {
        url: '/health?timestamp=123',
        headers: {},
      }

      await tenantMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })
  })

  describe('Protected routes (require tenant)', () => {
    it('should return 404 when x-tenant-slug header is missing', async () => {
      mockRequest = {
        url: '/api/professionals',
        headers: {},
      }

      await tenantMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith({
        error: 'Tenant not found',
        message: 'Missing x-tenant-slug header',
      })
    })

    it('should return 404 when tenant does not exist', async () => {
      vi.mocked(getCachedTenant).mockResolvedValue(null)
      vi.mocked(prisma.barbershop.findUnique).mockResolvedValue(null)

      mockRequest = {
        url: '/api/professionals',
        headers: {
          'x-tenant-slug': 'non-existent',
        },
      }

      await tenantMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith({
        error: 'Tenant not found',
        message: 'Barbershop with slug "non-existent" does not exist',
      })
    })

    it('should return 404 when tenant is inactive', async () => {
      vi.mocked(getCachedTenant).mockResolvedValue(null)
      vi.mocked(prisma.barbershop.findUnique).mockResolvedValue({
        id: 'barbershop-1',
        isActive: false,
      } as any)

      mockRequest = {
        url: '/api/professionals',
        headers: {
          'x-tenant-slug': 'inactive-shop',
        },
      }

      await tenantMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith({
        error: 'Tenant not found',
        message: 'Barbershop with slug "inactive-shop" is inactive',
      })
    })

    it('should inject tenantId and tenantSlug from cache when tenant exists', async () => {
      vi.mocked(getCachedTenant).mockResolvedValue('barbershop-1')

      mockRequest = {
        url: '/api/professionals',
        headers: {
          'x-tenant-slug': 'test-shop',
        },
      }

      await tenantMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(mockRequest.tenantId).toBe('barbershop-1')
      expect(mockRequest.tenantSlug).toBe('test-shop')
      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('should query database, cache result, and inject tenant info when cache misses', async () => {
      vi.mocked(getCachedTenant).mockResolvedValue(null)
      vi.mocked(prisma.barbershop.findUnique).mockResolvedValue({
        id: 'barbershop-2',
        isActive: true,
      } as any)

      mockRequest = {
        url: '/api/professionals',
        headers: {
          'x-tenant-slug': 'new-shop',
        },
      }

      await tenantMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      )

      expect(prisma.barbershop.findUnique).toHaveBeenCalledWith({
        where: { slug: 'new-shop' },
        select: { id: true, isActive: true },
      })
      expect(cacheTenant).toHaveBeenCalledWith('new-shop', 'barbershop-2')
      expect(mockRequest.tenantId).toBe('barbershop-2')
      expect(mockRequest.tenantSlug).toBe('new-shop')
      expect(statusMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })
  })
})
