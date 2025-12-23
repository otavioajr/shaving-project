import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { AuthenticatedUser } from '../../types/index.js'
import { Decimal } from '@prisma/client/runtime/library'

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

const serviceFindFirst = vi.fn()
const serviceUpdate = vi.fn()
const serviceFindMany = vi.fn()
const serviceCount = vi.fn()
const serviceCreate = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    service: {
      findFirst: serviceFindFirst,
      findMany: serviceFindMany,
      count: serviceCount,
      update: serviceUpdate,
      create: serviceCreate,
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

describe('Service Controller', () => {
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

  it('requires authentication for listing services', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/services',
      headers: { 'x-tenant-slug': 'barbearia-teste' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('forbids barber from creating services', async () => {
    const token = makeToken('BARBER')
    const response = await app.inject({
      method: 'POST',
      url: '/api/services',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-slug': 'barbearia-teste',
      },
      payload: {
        name: 'Corte',
        price: 35,
        duration: 30,
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it('soft deletes service when admin requests delete', async () => {
    const token = makeToken('ADMIN', { id: 'admin-1' })
    const existing = {
      id: 'service-1',
      barbershopId: 'tenant-id',
      name: 'Corte',
      price: new Decimal('35'),
      duration: 30,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    serviceFindFirst.mockResolvedValue(existing)
    serviceUpdate.mockResolvedValue({ ...existing, isActive: false })

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/services/service-1',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-slug': 'barbearia-teste',
      },
    })

    expect(response.statusCode).toBe(204)
    expect(serviceUpdate).toHaveBeenCalledWith({
      where: { id: 'service-1' },
      data: { isActive: false },
    })
  })
})
