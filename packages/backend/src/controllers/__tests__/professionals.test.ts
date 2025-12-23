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

const professionalFindFirst = vi.fn()
const professionalUpdate = vi.fn()
const professionalFindMany = vi.fn()
const professionalCount = vi.fn()
const professionalCreate = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    professional: {
      findFirst: professionalFindFirst,
      findMany: professionalFindMany,
      count: professionalCount,
      update: professionalUpdate,
      create: professionalCreate,
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

describe('Professional Controller', () => {
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

  it('requires authentication for listing professionals', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/professionals',
      headers: { 'x-tenant-slug': 'barbearia-teste' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('rejects tenant mismatch on list', async () => {
    const token = makeToken('ADMIN', { barbershopId: 'other-tenant' })
    const response = await app.inject({
      method: 'GET',
      url: '/api/professionals',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-slug': 'barbearia-teste',
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it('forbids barber from creating professionals', async () => {
    const token = makeToken('BARBER')
    const response = await app.inject({
      method: 'POST',
      url: '/api/professionals',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-slug': 'barbearia-teste',
      },
      payload: {
        name: 'Novo Profissional',
        email: 'barber@example.com',
        password: 'senha123',
        commissionRate: 50,
        role: 'BARBER',
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it('forbids barber from updating role or commission', async () => {
    const token = makeToken('BARBER', { id: 'barber-1' })
    const response = await app.inject({
      method: 'PUT',
      url: '/api/professionals/barber-1',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-slug': 'barbearia-teste',
      },
      payload: {
        role: 'ADMIN',
      },
    })

    expect(response.statusCode).toBe(403)
    expect(professionalUpdate).not.toHaveBeenCalled()
  })

  it('soft deletes professional when admin requests delete', async () => {
    const token = makeToken('ADMIN', { id: 'admin-1' })
    const existing = {
      id: 'prof-1',
      barbershopId: 'tenant-id',
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: 'hash',
      commissionRate: new Decimal('10'),
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    professionalFindFirst.mockResolvedValue(existing)
    professionalUpdate.mockResolvedValue({ ...existing, isActive: false })

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/professionals/prof-1',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-slug': 'barbearia-teste',
      },
    })

    expect(response.statusCode).toBe(204)
    expect(professionalUpdate).toHaveBeenCalledWith({
      where: { id: 'prof-1' },
      data: { isActive: false },
    })
  })
})
