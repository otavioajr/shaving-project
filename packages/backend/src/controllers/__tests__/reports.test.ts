import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { AuthenticatedUser } from '../../types/index.js'

// Mock Redis
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

// Mock Prisma
const transactionGroupBy = vi.fn()
const appointmentAggregate = vi.fn()
const appointmentGroupBy = vi.fn()
const professionalFindMany = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    transaction: {
      groupBy: transactionGroupBy,
    },
    appointment: {
      aggregate: appointmentAggregate,
      groupBy: appointmentGroupBy,
    },
    professional: {
      findMany: professionalFindMany,
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

describe('Report Controller', () => {
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

  describe('GET /api/reports/summary', () => {
    it('requires authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/reports/summary',
        query: {
          dateFrom: '2023-01-01T00:00:00Z',
          dateTo: '2023-01-31T23:59:59Z',
        },
        headers: { 'x-tenant-slug': 'barbearia-teste' },
      })

      expect(response.statusCode).toBe(401)
    })

    it('validates date parameters', async () => {
      const token = makeToken('ADMIN')
      const response = await app.inject({
        method: 'GET',
        url: '/api/reports/summary',
        query: {
          dateFrom: 'invalid-date',
          dateTo: '2023-01-31T23:59:59Z',
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-slug': 'barbearia-teste',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('validates date range logic (from <= to)', async () => {
      const token = makeToken('ADMIN')
      const response = await app.inject({
        method: 'GET',
        url: '/api/reports/summary',
        query: {
          dateFrom: '2023-02-01T00:00:00Z',
          dateTo: '2023-01-01T00:00:00Z',
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-slug': 'barbearia-teste',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('returns financial summary on success', async () => {
      const token = makeToken('ADMIN')

      transactionGroupBy.mockResolvedValue([
        { type: 'INCOME', category: 'Services', _sum: { amount: 1000 }, _count: { _all: 10 } },
        { type: 'EXPENSE', category: 'Supplies', _sum: { amount: 200 }, _count: { _all: 2 } },
      ])
      appointmentAggregate.mockResolvedValue({
        _sum: { price: 1500, commissionValue: 500 },
        _count: { _all: 15 },
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/reports/summary',
        query: {
          dateFrom: '2023-01-01T00:00:00Z',
          dateTo: '2023-01-31T23:59:59Z',
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-slug': 'barbearia-teste',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.payload)
      expect(body.income.total).toBe(1000)
      expect(body.expenses.total).toBe(200)
      expect(body.net).toBe(800)
      expect(body.appointments.totalRevenue).toBe(1500)
    })
  })

  describe('GET /api/reports/commissions', () => {
    it('requires authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/reports/commissions',
        query: {
          dateFrom: '2023-01-01T00:00:00Z',
          dateTo: '2023-01-31T23:59:59Z',
        },
        headers: { 'x-tenant-slug': 'barbearia-teste' },
      })

      expect(response.statusCode).toBe(401)
    })

    it('returns commission report on success', async () => {
      const token = makeToken('ADMIN')

      appointmentGroupBy.mockResolvedValue([
        {
          professionalId: 'prof-1',
          _sum: { price: 500, commissionValue: 250 },
          _count: { _all: 5 },
        },
      ])
      professionalFindMany.mockResolvedValue([
        {
          id: 'prof-1',
          name: 'Barber Joe',
          email: 'joe@test.com',
          commissionRate: { toNumber: () => 0.5 },
        },
      ])

      const response = await app.inject({
        method: 'GET',
        url: '/api/reports/commissions',
        query: {
          dateFrom: '2023-01-01T00:00:00Z',
          dateTo: '2023-01-31T23:59:59Z',
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-slug': 'barbearia-teste',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.payload)
      expect(body.professionals).toHaveLength(1)
      expect(body.professionals[0].name).toBe('Barber Joe')
      expect(body.totals.totalCommissions).toBe(250)
    })
  })
})
