import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { buildApp } from '../../app.js'
import { prisma } from '../../lib/prisma.js'
import { ipRatelimit, tenantRatelimit, getCachedTenant, cacheTenant } from '../../lib/redis.js'
import request from 'supertest'

// Mock dependencies
vi.mock('../../lib/prisma.js')
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
    app = await buildApp({ logger: false })
  })

  afterEach(async () => {
    await app.close()
  })

  describe('Public Routes', () => {
    it('should allow access to /health without tenant header', async () => {
      const response = await request(app.server)
        .get('/health')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'ok')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('environment')
    })

    it('should allow access to /docs without tenant header', async () => {
      const response = await request(app.server)
        .get('/docs')
        .expect(200)

      expect(response.headers['content-type']).toContain('text/html')
    })

    it('should allow access to / without tenant header', async () => {
      const response = await request(app.server)
        .get('/')
        .expect(200)

      expect(response.body).toHaveProperty('name', 'Barbershop SaaS API')
      expect(response.body).toHaveProperty('version', '1.0.0')
    })
  })

  describe('Tenant Middleware', () => {
    it('should return 404 when x-tenant-slug header is missing', async () => {
      const response = await request(app.server)
        .get('/api/test')
        .expect(404)

      expect(response.body).toHaveProperty('error', 'Tenant not found')
      expect(response.body).toHaveProperty('message', 'Missing x-tenant-slug header')
    })

    it('should return 404 when tenant does not exist', async () => {
      vi.mocked(getCachedTenant).mockResolvedValue(null)
      vi.mocked(prisma.barbershop.findUnique).mockResolvedValue(null)

      const response = await request(app.server)
        .get('/api/test')
        .set('x-tenant-slug', 'non-existent')
        .expect(404)

      expect(response.body).toHaveProperty('error', 'Tenant not found')
      expect(response.body.message).toContain('does not exist')
    })

    it('should return 404 when tenant is inactive', async () => {
      vi.mocked(getCachedTenant).mockResolvedValue(null)
      vi.mocked(prisma.barbershop.findUnique).mockResolvedValue({
        id: 'tenant-id',
        isActive: false,
      } as any)

      const response = await request(app.server)
        .get('/api/test')
        .set('x-tenant-slug', 'inactive-tenant')
        .expect(404)

      expect(response.body).toHaveProperty('error', 'Tenant not found')
      expect(response.body.message).toContain('is inactive')
    })

    it('should allow request when tenant is valid and active', async () => {
      vi.mocked(getCachedTenant).mockResolvedValue('tenant-id')
      
      // Create a test route that uses tenant info
      app.get('/api/test-tenant', async (request, reply) => {
        return {
          tenantId: request.tenantId,
          tenantSlug: request.tenantSlug,
        }
      })

      const response = await request(app.server)
        .get('/api/test-tenant')
        .set('x-tenant-slug', 'valid-tenant')
        .expect(200)

      expect(response.body).toHaveProperty('tenantId', 'tenant-id')
      expect(response.body).toHaveProperty('tenantSlug', 'valid-tenant')
    })

    it('should cache tenant after first lookup', async () => {
      vi.mocked(getCachedTenant).mockResolvedValueOnce(null).mockResolvedValueOnce('tenant-id')
      vi.mocked(prisma.barbershop.findUnique).mockResolvedValue({
        id: 'tenant-id',
        isActive: true,
      } as any)
      vi.mocked(cacheTenant).mockResolvedValue()

      app.get('/api/test-tenant', async (request, reply) => {
        return { tenantId: request.tenantId }
      })

      // First request - should query database
      await request(app.server)
        .get('/api/test-tenant')
        .set('x-tenant-slug', 'valid-tenant')
        .expect(200)

      expect(prisma.barbershop.findUnique).toHaveBeenCalledTimes(1)
      expect(cacheTenant).toHaveBeenCalledWith('valid-tenant', 'tenant-id')

      // Second request - should use cache
      await request(app.server)
        .get('/api/test-tenant')
        .set('x-tenant-slug', 'valid-tenant')
        .expect(200)

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
      } as any)

      vi.mocked(tenantRatelimit.limit).mockResolvedValue({
        success: true,
        limit: 1000,
        remaining: 999,
        reset: Date.now() + 60000,
      } as any)

      app.get('/api/test', async (request, reply) => {
        return { message: 'ok' }
      })

      const response = await request(app.server)
        .get('/api/test')
        .set('x-tenant-slug', 'valid-tenant')
        .expect(200)

      expect(response.body).toHaveProperty('message', 'ok')
      expect(response.headers['x-ratelimit-limit']).toBe('1000')
      expect(response.headers['x-ratelimit-remaining']).toBe('999')
    })

    it('should return 429 when IP rate limit is exceeded', async () => {
      vi.mocked(ipRatelimit.limit).mockResolvedValue({
        success: false,
        limit: 100,
        remaining: 0,
        reset: Date.now() + 60000,
      } as any)

      const response = await request(app.server)
        .get('/api/test')
        .set('x-tenant-slug', 'valid-tenant')
        .expect(429)

      expect(response.body).toHaveProperty('error', 'Too Many Requests')
      expect(response.body).toHaveProperty('message', 'Rate limit exceeded. Please try again later.')
      expect(response.headers['x-ratelimit-limit']).toBe('100')
      expect(response.headers['x-ratelimit-remaining']).toBe('0')
    })

    it('should return 429 when tenant rate limit is exceeded', async () => {
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

      const response = await request(app.server)
        .get('/api/test')
        .set('x-tenant-slug', 'valid-tenant')
        .expect(429)

      expect(response.body).toHaveProperty('error', 'Too Many Requests')
      expect(response.body).toHaveProperty('message', 'Tenant rate limit exceeded. Please try again later.')
      expect(response.headers['x-ratelimit-limit']).toBe('1000')
      expect(response.headers['x-ratelimit-remaining']).toBe('0')
    })
  })
})
