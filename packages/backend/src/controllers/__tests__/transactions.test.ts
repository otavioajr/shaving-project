import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { AuthenticatedUser } from '../../types/index.js'

const redisMock = {
  setex: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
  keys: vi.fn().mockResolvedValue([]),
}

const ipRatelimitMock = {
  limit: vi
    .fn()
    .mockResolvedValue({ success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 }),
}

const tenantRatelimitMock = {
  limit: vi
    .fn()
    .mockResolvedValue({ success: true, limit: 1000, remaining: 999, reset: Date.now() + 60000 }),
}

const getCachedTenant = vi.fn().mockResolvedValue('tenant-id')

vi.mock('../../lib/redis.js', () => ({
  redis: redisMock,
  default: redisMock,
  ipRatelimit: ipRatelimitMock,
  tenantRatelimit: tenantRatelimitMock,
  getCachedTenant,
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

const transactionFindMany = vi.fn()
const transactionCount = vi.fn()
const transactionFindUnique = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    transaction: {
      findMany: transactionFindMany,
      count: transactionCount,
      findUnique: transactionFindUnique,
    },
    barbershop: {
      findUnique: vi.fn(),
    },
  },
}))

async function buildTestApp(): Promise<FastifyInstance> {
  const { buildApp } = await import('../../app.js')
  return buildApp({ logger: false })
}

describe('Transaction Controller', () => {
  let app: FastifyInstance
  let makeToken: (role: AuthenticatedUser['role'], overrides?: Partial<AuthenticatedUser>) => string

  beforeEach(async () => {
    vi.clearAllMocks()
    getCachedTenant.mockResolvedValue('tenant-id')
    ipRatelimitMock.limit.mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    })
    tenantRatelimitMock.limit.mockResolvedValue({
      success: true,
      limit: 1000,
      remaining: 999,
      reset: Date.now() + 60000,
    })
    app = await buildTestApp()
    makeToken = (role, overrides = {}) =>
      app.jwt.sign({
        id: 'user-1',
        email: 'user@example.com',
        barbershopId: 'tenant-id',
        role,
        ...overrides,
      })
  })

  afterEach(async () => {
    await app.close()
  })

  it('requires authentication for listing transactions', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/transactions',
      headers: { 'x-tenant-slug': 'barbearia-teste' },
    })

    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.payload)
    expect(body.error).toBe('Authentication required')
  })

  it('rejects tenant mismatch on list transactions', async () => {
    const token = makeToken('ADMIN', { barbershopId: 'other-tenant' })
    const response = await app.inject({
      method: 'GET',
      url: '/api/transactions',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-slug': 'barbearia-teste',
      },
    })

    expect(response.statusCode).toBe(403)
    const body = JSON.parse(response.payload)
    expect(body.error).toBe('Tenant mismatch')
  })

  it('requires authentication for getting transaction by id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/transactions/tx-1',
      headers: { 'x-tenant-slug': 'barbearia-teste' },
    })

    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.payload)
    expect(body.error).toBe('Authentication required')
  })

  it('rejects tenant mismatch on get transaction by id', async () => {
    const token = makeToken('ADMIN', { barbershopId: 'other-tenant' })
    const response = await app.inject({
      method: 'GET',
      url: '/api/transactions/tx-1',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-slug': 'barbearia-teste',
      },
    })

    expect(response.statusCode).toBe(403)
    const body = JSON.parse(response.payload)
    expect(body.error).toBe('Tenant mismatch')
  })

  it('returns 200 for valid authorized list request', async () => {
    const token = makeToken('ADMIN')
    transactionFindMany.mockResolvedValue([])
    transactionCount.mockResolvedValue(0)

    const response = await app.inject({
      method: 'GET',
      url: '/api/transactions',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-slug': 'barbearia-teste',
      },
    })

    expect(response.statusCode).toBe(200)
  })
})
