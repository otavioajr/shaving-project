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

const clientFindFirst = vi.fn()
const clientUpdate = vi.fn()
const clientFindMany = vi.fn()
const clientCount = vi.fn()
const clientCreate = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    client: {
      findFirst: clientFindFirst,
      findMany: clientFindMany,
      count: clientCount,
      update: clientUpdate,
      create: clientCreate,
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

describe('Client Controller', () => {
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

  it('requires authentication for listing clients', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/clients',
      headers: { 'x-tenant-slug': 'barbearia-teste' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('rejects tenant mismatch on list', async () => {
    const token = makeToken('ADMIN', { barbershopId: 'other-tenant' })
    const response = await app.inject({
      method: 'GET',
      url: '/api/clients',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-slug': 'barbearia-teste',
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it('soft deletes client when authenticated user requests delete', async () => {
    const token = makeToken('BARBER')
    const existing = {
      id: 'client-1',
      barbershopId: 'tenant-id',
      name: 'Client',
      phone: '11999999999',
      pushSubscription: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    clientFindFirst.mockResolvedValue(existing)
    clientUpdate.mockResolvedValue({ ...existing, isActive: false })

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/clients/client-1',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-slug': 'barbearia-teste',
      },
    })

    expect(response.statusCode).toBe(204)
    expect(clientUpdate).toHaveBeenCalledWith({
      where: { id: 'client-1' },
      data: { isActive: false },
    })
  })
})
