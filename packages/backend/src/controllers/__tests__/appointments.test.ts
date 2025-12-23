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

const appointmentFindFirst = vi.fn()
const appointmentUpdate = vi.fn()
const appointmentFindMany = vi.fn()
const appointmentCount = vi.fn()
const appointmentCreate = vi.fn()

const professionalFindFirst = vi.fn()
const clientFindFirst = vi.fn()
const serviceFindFirst = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    appointment: {
      findFirst: appointmentFindFirst,
      findMany: appointmentFindMany,
      count: appointmentCount,
      update: appointmentUpdate,
      create: appointmentCreate,
    },
    professional: {
      findFirst: professionalFindFirst,
    },
    client: {
      findFirst: clientFindFirst,
    },
    service: {
      findFirst: serviceFindFirst,
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

describe('Appointment Controller', () => {
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

  describe('Authentication', () => {
    it('requires authentication for listing appointments', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/appointments',
        headers: { 'x-tenant-slug': 'barbearia-teste' },
      })

      expect(response.statusCode).toBe(401)
      expect(response.json()).toHaveProperty('error', 'Authentication required')
    })

    it('requires authentication for getting appointment by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/appointments/apt-1',
        headers: { 'x-tenant-slug': 'barbearia-teste' },
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('Tenant Mismatch', () => {
    it('returns 403 when user barbershopId does not match tenant', async () => {
      const token = makeToken('ADMIN', { barbershopId: 'different-tenant' })

      const response = await app.inject({
        method: 'GET',
        url: '/api/appointments',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-slug': 'barbearia-teste',
        },
      })

      expect(response.statusCode).toBe(403)
      expect(response.json()).toHaveProperty('error', 'Tenant mismatch')
    })
  })

  describe('List Appointments with Date Range', () => {
    it('applies startDate and endDate filters to query', async () => {
      const token = makeToken('ADMIN')
      appointmentFindMany.mockResolvedValue([])
      appointmentCount.mockResolvedValue(0)

      const response = await app.inject({
        method: 'GET',
        url: '/api/appointments?startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-slug': 'barbearia-teste',
        },
      })

      expect(response.statusCode).toBe(200)
      expect(appointmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2025-01-01T00:00:00Z'),
              lte: new Date('2025-01-31T23:59:59Z'),
            },
          }),
        })
      )
    })
  })

  describe('Create Appointment', () => {
    it('creates appointment without conflict', async () => {
      const token = makeToken('ADMIN')
      const professional = {
        id: 'prof-1',
        barbershopId: 'tenant-id',
        name: 'Barber 1',
        email: 'barber@test.com',
        passwordHash: 'hash',
        commissionRate: new Decimal('20'),
        role: 'BARBER' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const client = {
        id: 'client-1',
        barbershopId: 'tenant-id',
        name: 'Client 1',
        phone: '123456',
        pushSubscription: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const service = {
        id: 'service-1',
        barbershopId: 'tenant-id',
        name: 'Haircut',
        price: new Decimal('50'),
        duration: 30,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      professionalFindFirst.mockResolvedValue(professional)
      clientFindFirst.mockResolvedValue(client)
      serviceFindFirst.mockResolvedValue(service)
      appointmentFindMany.mockResolvedValue([]) // No conflicts

      const newAppointment = {
        id: 'apt-1',
        barbershopId: 'tenant-id',
        professionalId: 'prof-1',
        clientId: 'client-1',
        serviceId: 'service-1',
        createdById: 'user-1',
        date: new Date('2025-12-25T10:00:00Z'),
        status: 'PENDING',
        price: new Decimal('50'),
        commissionValue: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        professional,
        client,
        service,
        createdBy: professional,
      }
      appointmentCreate.mockResolvedValue(newAppointment)

      const response = await app.inject({
        method: 'POST',
        url: '/api/appointments',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-slug': 'barbearia-teste',
        },
        payload: {
          professionalId: 'prof-1',
          clientId: 'client-1',
          serviceId: 'service-1',
          date: '2025-12-25T10:00:00Z',
        },
      })

      expect(response.statusCode).toBe(201)
      expect(appointmentCreate).toHaveBeenCalled()
    })

    it('returns 409 when there is a scheduling conflict', async () => {
      const token = makeToken('ADMIN')
      const professional = {
        id: 'prof-1',
        barbershopId: 'tenant-id',
        name: 'Barber 1',
        email: 'barber@test.com',
        passwordHash: 'hash',
        commissionRate: new Decimal('20'),
        role: 'BARBER' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const client = {
        id: 'client-1',
        barbershopId: 'tenant-id',
        name: 'Client 1',
        phone: '123456',
        pushSubscription: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const service = {
        id: 'service-1',
        barbershopId: 'tenant-id',
        name: 'Haircut',
        price: new Decimal('50'),
        duration: 30,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      professionalFindFirst.mockResolvedValue(professional)
      clientFindFirst.mockResolvedValue(client)
      serviceFindFirst.mockResolvedValue(service)

      // Mock a conflicting appointment (not CANCELLED)
      const conflictingAppointment = {
        id: 'apt-existing',
        date: new Date('2025-12-25T10:00:00Z'),
        status: 'CONFIRMED',
        service: { duration: 60 },
      }
      appointmentFindMany.mockResolvedValue([conflictingAppointment])

      const response = await app.inject({
        method: 'POST',
        url: '/api/appointments',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-slug': 'barbearia-teste',
        },
        payload: {
          professionalId: 'prof-1',
          clientId: 'client-1',
          serviceId: 'service-1',
          date: '2025-12-25T10:15:00Z',
        },
      })

      expect(response.statusCode).toBe(409)
      expect(response.json()).toHaveProperty('error')
      expect(response.json().error).toContain('conflict')
    })

    it('ignores CANCELLED appointments when checking conflicts', async () => {
      const token = makeToken('ADMIN')
      const professional = {
        id: 'prof-1',
        barbershopId: 'tenant-id',
        name: 'Barber 1',
        email: 'barber@test.com',
        passwordHash: 'hash',
        commissionRate: new Decimal('20'),
        role: 'BARBER' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const client = {
        id: 'client-1',
        barbershopId: 'tenant-id',
        name: 'Client 1',
        phone: '123456',
        pushSubscription: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const service = {
        id: 'service-1',
        barbershopId: 'tenant-id',
        name: 'Haircut',
        price: new Decimal('50'),
        duration: 30,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      professionalFindFirst.mockResolvedValue(professional)
      clientFindFirst.mockResolvedValue(client)
      serviceFindFirst.mockResolvedValue(service)

      // Verify that CANCELLED appointments are excluded from conflict check
      appointmentFindMany.mockImplementation((args) => {
        // Check that the where clause excludes CANCELLED status
        expect(args.where.status).toEqual({ notIn: ['CANCELLED'] })
        return []
      })

      const newAppointment = {
        id: 'apt-1',
        barbershopId: 'tenant-id',
        professionalId: 'prof-1',
        clientId: 'client-1',
        serviceId: 'service-1',
        createdById: 'user-1',
        date: new Date('2025-12-25T10:00:00Z'),
        status: 'PENDING',
        price: new Decimal('50'),
        commissionValue: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        professional,
        client,
        service,
        createdBy: professional,
      }
      appointmentCreate.mockResolvedValue(newAppointment)

      const response = await app.inject({
        method: 'POST',
        url: '/api/appointments',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-slug': 'barbearia-teste',
        },
        payload: {
          professionalId: 'prof-1',
          clientId: 'client-1',
          serviceId: 'service-1',
          date: '2025-12-25T10:00:00Z',
        },
      })

      expect(response.statusCode).toBe(201)
    })
  })

  describe('Status Transitions', () => {
    it('returns 400 for invalid transition PENDING -> COMPLETED', async () => {
      const token = makeToken('ADMIN')
      const appointment = {
        id: 'apt-1',
        barbershopId: 'tenant-id',
        professionalId: 'prof-1',
        clientId: 'client-1',
        serviceId: 'service-1',
        createdById: 'user-1',
        date: new Date(),
        status: 'PENDING',
        price: new Decimal('50'),
        commissionValue: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      appointmentFindFirst.mockResolvedValue(appointment)

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/appointments/apt-1/status',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-slug': 'barbearia-teste',
        },
        payload: { status: 'COMPLETED' },
      })

      expect(response.statusCode).toBe(400)
      expect(response.json()).toHaveProperty('error')
      expect(response.json().error).toContain('Invalid status transition')
    })

    it('allows valid transition PENDING -> CONFIRMED', async () => {
      const token = makeToken('ADMIN')
      const appointment = {
        id: 'apt-1',
        barbershopId: 'tenant-id',
        professionalId: 'prof-1',
        clientId: 'client-1',
        serviceId: 'service-1',
        createdById: 'user-1',
        date: new Date(),
        status: 'PENDING',
        price: new Decimal('50'),
        commissionValue: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        professional: {
          id: 'prof-1',
          barbershopId: 'tenant-id',
          name: 'Barber 1',
          email: 'barber@test.com',
          commissionRate: new Decimal('20'),
          role: 'BARBER' as const,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        client: {
          id: 'client-1',
          barbershopId: 'tenant-id',
          name: 'Client 1',
          phone: '123456',
          pushSubscription: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        service: {
          id: 'service-1',
          barbershopId: 'tenant-id',
          name: 'Haircut',
          price: new Decimal('50'),
          duration: 30,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        createdBy: {
          id: 'user-1',
          barbershopId: 'tenant-id',
          name: 'Admin',
          email: 'admin@test.com',
          commissionRate: new Decimal('0'),
          role: 'ADMIN' as const,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      appointmentFindFirst.mockResolvedValue(appointment)
      appointmentUpdate.mockResolvedValue({ ...appointment, status: 'CONFIRMED' })

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/appointments/apt-1/status',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-slug': 'barbearia-teste',
        },
        payload: { status: 'CONFIRMED' },
      })

      expect(response.statusCode).toBe(200)
      expect(appointmentUpdate).toHaveBeenCalled()
    })

    it('calculates commission when transitioning CONFIRMED -> COMPLETED', async () => {
      const token = makeToken('ADMIN')
      const professional = {
        id: 'prof-1',
        barbershopId: 'tenant-id',
        name: 'Barber 1',
        email: 'barber@test.com',
        commissionRate: new Decimal('20'),
        role: 'BARBER' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const appointment = {
        id: 'apt-1',
        barbershopId: 'tenant-id',
        professionalId: 'prof-1',
        clientId: 'client-1',
        serviceId: 'service-1',
        createdById: 'user-1',
        date: new Date(),
        status: 'CONFIRMED',
        price: new Decimal('50'),
        commissionValue: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        professional,
        client: {
          id: 'client-1',
          barbershopId: 'tenant-id',
          name: 'Client 1',
          phone: '123456',
          pushSubscription: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        service: {
          id: 'service-1',
          barbershopId: 'tenant-id',
          name: 'Haircut',
          price: new Decimal('50'),
          duration: 30,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        createdBy: professional,
      }

      appointmentFindFirst.mockResolvedValue(appointment)
      professionalFindFirst.mockResolvedValue(professional)
      appointmentUpdate.mockResolvedValue({
        ...appointment,
        status: 'COMPLETED',
        commissionValue: new Decimal('10'),
      })

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/appointments/apt-1/status',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-slug': 'barbearia-teste',
        },
        payload: { status: 'COMPLETED' },
      })

      expect(response.statusCode).toBe(200)
      expect(appointmentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            commissionValue: 10, // 20% of 50
          }),
        })
      )
    })
  })

  describe('Cancellation (DELETE)', () => {
    it('cancels PENDING appointment by setting status to CANCELLED', async () => {
      const token = makeToken('ADMIN')
      const appointment = {
        id: 'apt-1',
        barbershopId: 'tenant-id',
        professionalId: 'prof-1',
        clientId: 'client-1',
        serviceId: 'service-1',
        createdById: 'user-1',
        date: new Date(),
        status: 'PENDING',
        price: new Decimal('50'),
        commissionValue: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      appointmentFindFirst.mockResolvedValue(appointment)
      appointmentUpdate.mockResolvedValue({ ...appointment, status: 'CANCELLED' })

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/appointments/apt-1',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-slug': 'barbearia-teste',
        },
      })

      expect(response.statusCode).toBe(204)
      expect(appointmentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'CANCELLED' },
        })
      )
    })

    it('returns 400 when trying to delete COMPLETED appointment', async () => {
      const token = makeToken('ADMIN')
      const appointment = {
        id: 'apt-1',
        barbershopId: 'tenant-id',
        professionalId: 'prof-1',
        clientId: 'client-1',
        serviceId: 'service-1',
        createdById: 'user-1',
        date: new Date(),
        status: 'COMPLETED',
        price: new Decimal('50'),
        commissionValue: new Decimal('10'),
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      appointmentFindFirst.mockResolvedValue(appointment)

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/appointments/apt-1',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-slug': 'barbearia-teste',
        },
      })

      expect(response.statusCode).toBe(400)
      expect(response.json()).toHaveProperty('error')
      expect(response.json().error).toContain('Invalid status transition')
    })
  })
})
