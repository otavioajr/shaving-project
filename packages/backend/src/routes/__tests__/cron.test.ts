import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'

// Mock notification service
const mockProcessReminders = vi.fn()

vi.mock('../../services/notificationService.js', () => ({
  notificationService: {
    processReminders: mockProcessReminders,
  },
}))

// Mock redis (for middleware)
vi.mock('../../lib/redis.js', () => ({
  redis: { get: vi.fn(), setex: vi.fn(), del: vi.fn() },
  getCachedTenant: vi.fn().mockResolvedValue(null),
  cacheTenant: vi.fn(),
  ipRatelimit: {
    limit: vi
      .fn()
      .mockResolvedValue({ success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 }),
  },
  tenantRatelimit: {
    limit: vi
      .fn()
      .mockResolvedValue({ success: true, limit: 1000, remaining: 999, reset: Date.now() + 60000 }),
  },
}))

// Mock prisma (for middleware)
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    barbershop: { findUnique: vi.fn() },
  },
}))

async function buildTestApp(): Promise<FastifyInstance> {
  const { buildApp } = await import('../../app.js')
  return buildApp({ logger: false })
}

describe('Cron Routes', () => {
  let app: FastifyInstance
  const CRON_SECRET = 'test-cron-secret'

  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    app = await buildTestApp()
  })

  afterEach(async () => {
    await app.close()
    delete process.env.CRON_SECRET
  })

  describe('POST /api/cron/notify', () => {
    it('rejects request without cron secret', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/cron/notify',
      })
      expect(response.statusCode).toBe(401)
      expect(response.json().error).toBe('Invalid cron secret')
    })

    it('rejects request with wrong cron secret', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/cron/notify',
        headers: { 'x-cron-secret': 'wrong-secret' },
      })
      expect(response.statusCode).toBe(401)
    })

    it('processes reminders with valid cron secret', async () => {
      mockProcessReminders.mockResolvedValue({ sent: 5, errors: 1 })

      const response = await app.inject({
        method: 'POST',
        url: '/api/cron/notify',
        headers: { 'x-cron-secret': CRON_SECRET },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ sent: 5, errors: 1 })
    })

    it('does not require tenant header', async () => {
      mockProcessReminders.mockResolvedValue({ sent: 0, errors: 0 })

      // No x-tenant-slug header - should still work
      const response = await app.inject({
        method: 'POST',
        url: '/api/cron/notify',
        headers: { 'x-cron-secret': CRON_SECRET },
      })

      expect(response.statusCode).toBe(200)
    })

    it('handles service errors gracefully', async () => {
      mockProcessReminders.mockRejectedValue(new Error('Database connection failed'))

      const response = await app.inject({
        method: 'POST',
        url: '/api/cron/notify',
        headers: { 'x-cron-secret': CRON_SECRET },
      })

      expect(response.statusCode).toBe(500)
      expect(response.json().error).toBe('Database connection failed')
    })

    it('returns generic error message in production environment', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      mockProcessReminders.mockRejectedValue(new Error('Database connection failed'))

      const response = await app.inject({
        method: 'POST',
        url: '/api/cron/notify',
        headers: { 'x-cron-secret': CRON_SECRET },
      })

      expect(response.statusCode).toBe(500)
      expect(response.json().error).toBe('An internal error occurred while processing reminders')

      process.env.NODE_ENV = originalEnv
    })

    it('returns 500 when CRON_SECRET is not configured', async () => {
      delete process.env.CRON_SECRET
      const app2 = await buildTestApp()

      const response = await app2.inject({
        method: 'POST',
        url: '/api/cron/notify',
        headers: { 'x-cron-secret': 'any-secret' },
      })

      expect(response.statusCode).toBe(500)
      expect(response.json().error).toBe('CRON_SECRET not configured')

      await app2.close()
    })
  })
})
