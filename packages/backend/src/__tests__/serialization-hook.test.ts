import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { buildApp } from '../app.js'
import { ipRatelimit, tenantRatelimit, getCachedTenant } from '../lib/redis.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    barbershop: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('../lib/redis.js', () => ({
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

describe('Serialization Hook', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeEach(async () => {
    vi.clearAllMocks()
    const ipLimit: Awaited<ReturnType<typeof ipRatelimit.limit>> = {
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    }
    const tenantLimit: Awaited<ReturnType<typeof tenantRatelimit.limit>> = {
      success: true,
      limit: 1000,
      remaining: 999,
      reset: Date.now() + 60000,
    }
    vi.mocked(ipRatelimit.limit).mockResolvedValue(ipLimit)
    vi.mocked(tenantRatelimit.limit).mockResolvedValue(tenantLimit)
    vi.mocked(getCachedTenant).mockResolvedValue('tenant-id')
    app = await buildApp({ logger: false })

    app.get(
      '/api/test-decimal',
      {
        schema: {
          response: {
            200: {
              type: 'object',
              required: ['amount', 'createdAt', 'items'],
              properties: {
                amount: { type: 'number' },
                createdAt: { type: 'string', format: 'date-time' },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['price', 'issuedAt'],
                    properties: {
                      price: { type: 'number' },
                      issuedAt: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      async () => ({
        amount: new Decimal('10.50'),
        createdAt: new Date('2025-01-15T10:20:30.000Z'),
        items: [
          {
            price: new Decimal('5'),
            issuedAt: new Date('2025-01-10T08:00:00.000Z'),
          },
        ],
      })
    )
  })

  afterEach(async () => {
    await app.close()
  })

  it('serializes Decimal to number and Date to ISO string for /api responses', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/test-decimal',
      headers: { 'x-tenant-slug': 'valid-tenant' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json() as {
      amount: number
      createdAt: string
      items: Array<{ price: number; issuedAt: string }>
    }
    expect(typeof body.amount).toBe('number')
    expect(body.amount).toBe(10.5)
    expect(body.createdAt).toBe('2025-01-15T10:20:30.000Z')
    expect(typeof body.items[0].price).toBe('number')
    expect(body.items[0].price).toBe(5)
    expect(body.items[0].issuedAt).toBe('2025-01-10T08:00:00.000Z')
  })
})
