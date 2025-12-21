import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { buildApp } from '../../app.js'
import { prisma } from '../../lib/prisma.js'
import { ipRatelimit, tenantRatelimit, getCachedTenant, cacheTenant } from '../../lib/redis.js'

type RateLimitResult = Awaited<ReturnType<typeof ipRatelimit.limit>>
type BarbershopRecord = Awaited<ReturnType<typeof prisma.barbershop.findUnique>>

// Mock dependencies
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    barbershop: {
      findUnique: vi.fn(),
    },
  },
}))
vi.mock('../../lib/redis.js', () => ({
  redis: {},
  ipRatelimit: {
    limit: vi.fn(),
  },
  tenantRatelimit: {
    limit: vi.fn(),
  },
  getCachedTenant: vi.fn(),
  cacheTenant: vi.fn(),
  storeOTP: vi.fn(),
  verifyOTP: vi.fn(),
  deleteOTP: vi.fn(),
  storeRefreshToken: vi.fn(),
  getRefreshToken: vi.fn(),
  deleteRefreshToken: vi.fn(),
  deleteAllRefreshTokens: vi.fn(),
  invalidateTenantCache: vi.fn(),
}))

describe('Middleware Integration Tests', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(ipRatelimit.limit).mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
      pending: Promise.resolve(),
    } as RateLimitResult)
    vi.mocked(tenantRatelimit.limit).mockResolvedValue({
      success: true,
      limit: 1000,
      remaining: 999,
      reset: Date.now() + 60000,
      pending: Promise.resolve(),
    } as RateLimitResult)
    app = await buildApp({ logger: false })
  })

  afterEach(async () => {
    await app.close()
  })

  describe('Public Routes', () => {
    it('should allow access to /health without tenant header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body).toHaveProperty('status', 'ok')
      expect(body).toHaveProperty('timestamp')
      expect(body).toHaveProperty('environment')
    })

    it('should allow access to /docs without tenant header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs',
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toContain('text/html')
    })

    it('should allow access to / without tenant header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body).toHaveProperty('name', 'Barbershop SaaS API')
      expect(body).toHaveProperty('version', '1.0.0')
    })
  })

  describe('Tenant Middleware', () => {
    it('should return 404 when x-tenant-slug header is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/test',
      })

      expect(response.statusCode).toBe(404)
      const body = response.json()
      expect(body).toHaveProperty('error', 'Tenant not found')
      expect(body).toHaveProperty('message', 'Missing x-tenant-slug header')
    })

    it('should return 404 when tenant does not exist', async () => {
      vi.mocked(getCachedTenant).mockResolvedValue(null)
      vi.mocked(prisma.barbershop.findUnique).mockResolvedValue(null)

      const response = await app.inject({
        method: 'GET',
        url: '/api/test',
        headers: { 'x-tenant-slug': 'non-existent' },
      })

      expect(response.statusCode).toBe(404)
      const body = response.json()
      expect(body).toHaveProperty('error', 'Tenant not found')
      expect(body.message).toContain('does not exist')
    })

    it('should return 404 when tenant is inactive', async () => {
      vi.mocked(getCachedTenant).mockResolvedValue(null)
      vi.mocked(prisma.barbershop.findUnique).mockResolvedValue({
        id: 'tenant-id',
        isActive: false,
      } as BarbershopRecord)

      const response = await app.inject({
        method: 'GET',
        url: '/api/test',
        headers: { 'x-tenant-slug': 'inactive-tenant' },
      })

      expect(response.statusCode).toBe(404)
      const body = response.json()
      expect(body).toHaveProperty('error', 'Tenant not found')
      expect(body.message).toContain('is inactive')
    })

    it('should allow request when tenant is valid and active', async () => {
      vi.mocked(getCachedTenant).mockResolvedValue('tenant-id')

      // Create a test route that uses tenant info
      app.get('/api/test-tenant', async (request, _reply) => {
        return {
          tenantId: request.tenantId,
          tenantSlug: request.tenantSlug,
        }
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/test-tenant',
        headers: { 'x-tenant-slug': 'valid-tenant' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body).toHaveProperty('tenantId', 'tenant-id')
      expect(body).toHaveProperty('tenantSlug', 'valid-tenant')
    })

    it('should cache tenant after first lookup', async () => {
      vi.mocked(getCachedTenant).mockResolvedValueOnce(null).mockResolvedValueOnce('tenant-id')
      vi.mocked(prisma.barbershop.findUnique).mockResolvedValue({
        id: 'tenant-id',
        isActive: true,
      } as BarbershopRecord)
      vi.mocked(cacheTenant).mockResolvedValue()

      app.get('/api/test-tenant', async (request, _reply) => {
        return { tenantId: request.tenantId }
      })

      // First request - should query database
      await app.inject({
        method: 'GET',
        url: '/api/test-tenant',
        headers: { 'x-tenant-slug': 'valid-tenant' },
      })

      expect(prisma.barbershop.findUnique).toHaveBeenCalledTimes(1)
      expect(cacheTenant).toHaveBeenCalledWith('valid-tenant', 'tenant-id')

      // Second request - should use cache
      await app.inject({
        method: 'GET',
        url: '/api/test-tenant',
        headers: { 'x-tenant-slug': 'valid-tenant' },
      })

      // Should not query database again (cache hit)
      expect(prisma.barbershop.findUnique).toHaveBeenCalledTimes(1)
    })
  })

  describe('Rate Limit Middleware', () => {
    beforeEach(() => {
      // Mock valid tenant for rate limit tests
      vi.mocked(getCachedTenant).mockResolvedValue('tenant-id')
    })

    it('should allow requests within rate limit', async () => {
      vi.mocked(ipRatelimit.limit).mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
        pending: Promise.resolve(),
      } as RateLimitResult)

      vi.mocked(tenantRatelimit.limit).mockResolvedValue({
        success: true,
        limit: 1000,
        remaining: 999,
        reset: Date.now() + 60000,
        pending: Promise.resolve(),
      } as RateLimitResult)

      app.get('/api/test', async (_request, _reply) => {
        return { message: 'ok' }
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/test',
        headers: { 'x-tenant-slug': 'valid-tenant' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body).toHaveProperty('message', 'ok')
      expect(response.headers['x-ratelimit-limit']).toBe('1000')
      expect(response.headers['x-ratelimit-remaining']).toBe('999')
    })

    it('should return 429 when IP rate limit is exceeded', async () => {
      vi.mocked(ipRatelimit.limit).mockResolvedValue({
        success: false,
        limit: 100,
        remaining: 0,
        reset: Date.now() + 60000,
        pending: Promise.resolve(),
      } as RateLimitResult)

      const response = await app.inject({
        method: 'GET',
        url: '/api/test',
        headers: { 'x-tenant-slug': 'valid-tenant' },
      })

      expect(response.statusCode).toBe(429)
      const body = response.json()
      expect(body).toHaveProperty('error', 'Too Many Requests')
      expect(body).toHaveProperty('message', 'Rate limit exceeded. Please try again later.')
      expect(response.headers['x-ratelimit-limit']).toBe('100')
      expect(response.headers['x-ratelimit-remaining']).toBe('0')
    })

    it('should return 429 when tenant rate limit is exceeded', async () => {
      vi.mocked(ipRatelimit.limit).mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
        pending: Promise.resolve(),
      } as RateLimitResult)

      vi.mocked(tenantRatelimit.limit).mockResolvedValue({
        success: false,
        limit: 1000,
        remaining: 0,
        reset: Date.now() + 60000,
        pending: Promise.resolve(),
      } as RateLimitResult)

      const response = await app.inject({
        method: 'GET',
        url: '/api/test',
        headers: { 'x-tenant-slug': 'valid-tenant' },
      })

      expect(response.statusCode).toBe(429)
      const body = response.json()
      expect(body).toHaveProperty('error', 'Too Many Requests')
      expect(body).toHaveProperty('message', 'Tenant rate limit exceeded. Please try again later.')
      expect(response.headers['x-ratelimit-limit']).toBe('1000')
      expect(response.headers['x-ratelimit-remaining']).toBe('0')
    })
  })
})
