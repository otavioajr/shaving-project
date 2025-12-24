import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { AuthenticatedUser } from '../../types/index.js'
import bcrypt from 'bcryptjs'

const redisMock = {
  setex: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
  keys: vi.fn().mockResolvedValue([]),
  set: vi.fn().mockResolvedValue('OK'),
}

const ipRatelimitMock = {
  limit: vi
    .fn()
    .mockResolvedValue({ success: true, limit: 1000, remaining: 999, reset: Date.now() + 60000 }),
}

const tenantRatelimitMock = {
  limit: vi
    .fn()
    .mockResolvedValue({ success: true, limit: 1000, remaining: 999, reset: Date.now() + 60000 }),
}

const getCachedTenant = vi.fn().mockResolvedValue(null)

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

// Prisma mocks
const barbershopFindUnique = vi.fn()
const barbershopCreate = vi.fn()
const barbershopUpdate = vi.fn()
const professionalFindFirst = vi.fn()
const professionalFindMany = vi.fn()
const professionalCreate = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    barbershop: {
      findUnique: barbershopFindUnique,
      create: barbershopCreate,
      update: barbershopUpdate,
    },
    professional: {
      findFirst: professionalFindFirst,
      findMany: professionalFindMany,
      create: professionalCreate,
    },
  },
}))

async function buildTestApp(): Promise<FastifyInstance> {
  const { buildApp } = await import('../../app.js')
  return buildApp({ logger: false })
}

describe('Barbershop Endpoints', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    getCachedTenant.mockResolvedValue(null)
    redisMock.get.mockResolvedValue(null)
    redisMock.setex.mockResolvedValue('OK')
    redisMock.del.mockResolvedValue(1)
    app = await buildTestApp()
  })

  afterEach(async () => {
    await app.close()
  })

  describe('POST /api/barbershops - Self-registration', () => {
    it('should create a new barbershop with valid data (201)', async () => {
      const timestamp = Date.now()
      const slug = `nova-barbearia-${timestamp}`
      const email = `admin-${timestamp}@nova.com`

      // Mock slug uniqueness check (doesn't exist)
      barbershopFindUnique.mockResolvedValueOnce(null)
      // Mock email uniqueness check (doesn't exist)
      professionalFindFirst.mockResolvedValueOnce(null)
      // Mock barbershop creation with nested professional
      barbershopCreate.mockResolvedValueOnce({
        id: 'barbershop-id',
        name: 'Nova Barbearia',
        slug,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        professionals: [
          {
            id: 'admin-id',
            name: 'Admin Nova',
            email,
          },
        ],
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/barbershops',
        payload: {
          name: 'Nova Barbearia',
          slug,
          adminEmail: email,
          adminPassword: 'senhasegura123',
          adminName: 'Admin Nova',
        },
      })

      expect(response.statusCode).toBe(201)
      const data = JSON.parse(response.body)
      expect(data.barbershop.name).toBe('Nova Barbearia')
      expect(data.barbershop.slug).toBe(slug)
      expect(data.admin.name).toBe('Admin Nova')
      expect(data.admin.email).toBe(email)
      expect(data.accessToken).toBeDefined()
      expect(data.refreshToken).toBeDefined()
    })

    it('should reject duplicate slug (409)', async () => {
      const timestamp = Date.now()
      const slug = `barbearia-um-${timestamp}`

      // First call: slug doesn't exist (success)
      barbershopFindUnique.mockResolvedValueOnce(null)
      professionalFindFirst.mockResolvedValueOnce(null)
      barbershopCreate.mockResolvedValueOnce({
        id: 'barbershop-id-1',
        name: 'Barbearia Um',
        slug,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        professionals: [
          {
            id: 'admin-id-1',
            name: 'Admin Um',
            email: `admin1-${timestamp}@test.com`,
          },
        ],
      })

      // First registration
      await app.inject({
        method: 'POST',
        url: '/api/barbershops',
        payload: {
          name: 'Barbearia Um',
          slug,
          adminEmail: `admin1-${timestamp}@test.com`,
          adminPassword: 'senhasegura123',
          adminName: 'Admin Um',
        },
      })

      // Second call: slug already exists
      barbershopFindUnique.mockResolvedValueOnce({ id: 'existing-id', slug })

      // Duplicate attempt
      const response = await app.inject({
        method: 'POST',
        url: '/api/barbershops',
        payload: {
          name: 'Barbearia Dois',
          slug, // Same slug
          adminEmail: `admin2-${timestamp}@test.com`,
          adminPassword: 'senhasegura123',
          adminName: 'Admin Dois',
        },
      })

      expect(response.statusCode).toBe(409)
      const data = JSON.parse(response.body)
      expect(data.error).toContain('already in use')
    })

    it('should reject duplicate email globally (409)', async () => {
      const timestamp = Date.now()
      const email = `admin-global-${timestamp}@test.com`

      // First call: email doesn't exist (success)
      barbershopFindUnique.mockResolvedValueOnce(null)
      professionalFindFirst.mockResolvedValueOnce(null)
      barbershopCreate.mockResolvedValueOnce({
        id: 'barbershop-id-1',
        name: 'Barbearia Um',
        slug: `barbearia-um-global-${timestamp}`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        professionals: [
          {
            id: 'admin-id-1',
            name: 'Admin Um',
            email,
          },
        ],
      })

      // First registration
      await app.inject({
        method: 'POST',
        url: '/api/barbershops',
        payload: {
          name: 'Barbearia Um',
          slug: `barbearia-um-global-${timestamp}`,
          adminEmail: email,
          adminPassword: 'senhasegura123',
          adminName: 'Admin Um',
        },
      })

      // Second call: email already exists
      barbershopFindUnique.mockResolvedValueOnce(null) // Slug is unique
      professionalFindFirst.mockResolvedValueOnce({ id: 'existing-prof', email }) // Email exists

      // Try to use same email in different barbershop
      const response = await app.inject({
        method: 'POST',
        url: '/api/barbershops',
        payload: {
          name: 'Barbearia Dois',
          slug: `barbearia-dois-global-${timestamp}`,
          adminEmail: email, // Same email
          adminPassword: 'senhasegura123',
          adminName: 'Admin Dois',
        },
      })

      expect(response.statusCode).toBe(409)
      const data = JSON.parse(response.body)
      expect(data.error).toContain('already registered')
    })

    it('should reject invalid slug format (400)', async () => {
      const timestamp = Date.now()
      const response = await app.inject({
        method: 'POST',
        url: '/api/barbershops',
        payload: {
          name: 'Barbearia',
          slug: 'Barbershop', // Uppercase not allowed
          adminEmail: `admin-${timestamp}@test.com`,
          adminPassword: 'senhasegura123',
          adminName: 'Admin',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should reject short slug (400)', async () => {
      const timestamp = Date.now()
      const response = await app.inject({
        method: 'POST',
        url: '/api/barbershops',
        payload: {
          name: 'Barbearia',
          slug: 'ba', // Too short
          adminEmail: `admin-${timestamp}@test.com`,
          adminPassword: 'senhasegura123',
          adminName: 'Admin',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should reject short password (400)', async () => {
      const timestamp = Date.now()
      const response = await app.inject({
        method: 'POST',
        url: '/api/barbershops',
        payload: {
          name: 'Barbearia',
          slug: `barbearia-test-${timestamp}`,
          adminEmail: `admin-${timestamp}@test.com`,
          adminPassword: 'short', // Too short
          adminName: 'Admin',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should reject invalid email (400)', async () => {
      const timestamp = Date.now()
      const response = await app.inject({
        method: 'POST',
        url: '/api/barbershops',
        payload: {
          name: 'Barbearia',
          slug: `barbearia-test-${timestamp}`,
          adminEmail: 'not-an-email', // Invalid email
          adminPassword: 'senhasegura123',
          adminName: 'Admin',
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('GET /api/barbershops/:slug - Public Info', () => {
    it('should return public info for valid slug (200)', async () => {
      const timestamp = Date.now()
      const barbershopSlug = `barbearia-publica-${timestamp}`

      barbershopFindUnique.mockResolvedValueOnce({
        id: 'barbershop-id',
        name: 'Barbearia Publica',
        slug: barbershopSlug,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/barbershops/${barbershopSlug}`,
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(data.id).toBeDefined()
      expect(data.name).toBe('Barbearia Publica')
      expect(data.slug).toBe(barbershopSlug)
      expect(data.isActive).toBe(true)
    })

    it('should return 404 for non-existent slug', async () => {
      barbershopFindUnique.mockResolvedValueOnce(null)

      const response = await app.inject({
        method: 'GET',
        url: '/api/barbershops/nao-existe',
      })

      expect(response.statusCode).toBe(404)
    })

    it('should return 404 for inactive barbershop', async () => {
      const timestamp = Date.now()
      const barbershopSlug = `barbearia-publica-${timestamp}`

      // Mock inactive barbershop
      barbershopFindUnique.mockResolvedValueOnce({
        id: 'barbershop-id',
        name: 'Barbearia Publica',
        slug: barbershopSlug,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const inactiveResponse = await app.inject({
        method: 'GET',
        url: `/api/barbershops/${barbershopSlug}`,
      })

      expect(inactiveResponse.statusCode).toBe(404)
    })

    it('should not expose sensitive data in public info', async () => {
      const timestamp = Date.now()
      const barbershopSlug = `barbearia-publica-${timestamp}`

      barbershopFindUnique.mockResolvedValueOnce({
        id: 'barbershop-id',
        name: 'Barbearia Publica',
        slug: barbershopSlug,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/barbershops/${barbershopSlug}`,
      })

      const data = JSON.parse(response.body)
      expect(data.createdAt).toBeUndefined()
      expect(data.updatedAt).toBeUndefined()
    })
  })

  describe('GET /api/barbershop - Get Current Tenant', () => {
    let barbershopSlug: string
    let adminToken: string

    beforeEach(async () => {
      const timestamp = Date.now()
      barbershopSlug = `barbearia-get-${timestamp}`
      const uniqueEmail = `admin-${timestamp}@get.com`

      // Mock tenant cache
      getCachedTenant.mockResolvedValue('tenant-id')

      // Mock barbershop for tenant middleware (by slug)
      barbershopFindUnique.mockImplementation((args: { where: { slug?: string; id?: string } }) => {
        if (args.where.slug === barbershopSlug) {
          return Promise.resolve({
            id: 'tenant-id',
            slug: barbershopSlug,
            isActive: true,
          })
        }
        if (args.where.id === 'tenant-id') {
          return Promise.resolve({
            id: 'tenant-id',
            name: 'Barbearia Get Test',
            slug: barbershopSlug,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
        return Promise.resolve(null)
      })

      // Mock professional for login (admin)
      const passwordHash = await bcrypt.hash('senhasegura123', 10)
      professionalFindFirst.mockResolvedValue({
        id: 'admin-id',
        name: 'Admin Get',
        email: uniqueEmail,
        passwordHash,
        role: 'ADMIN',
        barbershopId: 'tenant-id',
        commissionRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Create admin token
      adminToken = app.jwt.sign({
        id: 'admin-id',
        email: uniqueEmail,
        barbershopId: 'tenant-id',
        role: 'ADMIN',
      } as AuthenticatedUser)
    })

    it('should return barbershop data with valid auth (200)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/barbershop',
        headers: {
          'x-tenant-slug': barbershopSlug,
          authorization: `Bearer ${adminToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(data.id).toBe('tenant-id')
      expect(data.name).toBe('Barbearia Get Test')
      expect(data.slug).toBe(barbershopSlug)
    })

    it('should reject without auth (401)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/barbershop',
        headers: {
          'x-tenant-slug': barbershopSlug,
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should reject with tenant mismatch (403)', async () => {
      const wrongToken = app.jwt.sign({
        id: 'admin-id',
        email: 'admin@wrong.com',
        barbershopId: 'wrong-tenant-id',
        role: 'ADMIN',
      } as AuthenticatedUser)

      const response = await app.inject({
        method: 'GET',
        url: '/api/barbershop',
        headers: {
          'x-tenant-slug': barbershopSlug,
          authorization: `Bearer ${wrongToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should return 404 if barbershop not found', async () => {
      barbershopFindUnique.mockResolvedValueOnce(null)

      const response = await app.inject({
        method: 'GET',
        url: '/api/barbershop',
        headers: {
          'x-tenant-slug': barbershopSlug,
          authorization: `Bearer ${adminToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('PUT /api/barbershop - Update Current Tenant', () => {
    let barbershopSlug: string
    let adminToken: string
    let barberToken: string

    beforeEach(async () => {
      // Setup for update tests
      const timestamp = Date.now()
      barbershopSlug = `barbearia-update-${timestamp}`
      const uniqueEmail = `admin-${timestamp}@update.com`
      const barberEmail = `barber-${timestamp}@update.com`

      // Mock tenant cache
      getCachedTenant.mockResolvedValue('tenant-id')

      // Mock barbershop for tenant middleware (by slug)
      barbershopFindUnique.mockImplementation((args: { where: { slug?: string; id?: string } }) => {
        if (args.where.slug === barbershopSlug) {
          return Promise.resolve({
            id: 'tenant-id',
            slug: barbershopSlug,
            isActive: true,
          })
        }
        if (args.where.id === 'tenant-id') {
          return Promise.resolve({
            id: 'tenant-id',
            name: 'Barbearia Update Test',
            slug: barbershopSlug,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
        return Promise.resolve(null)
      })

      // Mock barbershop update
      barbershopUpdate.mockResolvedValue({
        id: 'tenant-id',
        name: 'Barbearia Atualizada',
        slug: barbershopSlug,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Mock professional for login (admin)
      const passwordHash = await bcrypt.hash('senhasegura123', 10)
      professionalFindFirst.mockResolvedValue({
        id: 'admin-id',
        name: 'Admin Update',
        email: uniqueEmail,
        passwordHash,
        role: 'ADMIN',
        barbershopId: 'tenant-id',
        commissionRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Create admin token
      adminToken = app.jwt.sign({
        id: 'admin-id',
        email: uniqueEmail,
        barbershopId: 'tenant-id',
        role: 'ADMIN',
      } as AuthenticatedUser)

      // Mock professional for login (barber)
      professionalFindFirst.mockResolvedValue({
        id: 'barber-id',
        name: 'Barber Test',
        email: barberEmail,
        passwordHash,
        role: 'BARBER',
        barbershopId: 'tenant-id',
        commissionRate: 0.3,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Create barber token
      barberToken = app.jwt.sign({
        id: 'barber-id',
        email: barberEmail,
        barbershopId: 'tenant-id',
        role: 'BARBER',
      } as AuthenticatedUser)
    })

    it('should update name with ADMIN role (200)', async () => {
      barbershopUpdate.mockResolvedValueOnce({
        id: 'tenant-id',
        name: 'Barbearia Atualizada',
        slug: barbershopSlug,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const response = await app.inject({
        method: 'PUT',
        url: '/api/barbershop',
        headers: {
          'x-tenant-slug': barbershopSlug,
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Barbearia Atualizada',
        },
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(data.name).toBe('Barbearia Atualizada')
    })

    it('should update isActive with ADMIN role (200)', async () => {
      barbershopUpdate.mockResolvedValueOnce({
        id: 'tenant-id',
        name: 'Barbearia Update Test',
        slug: barbershopSlug,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const response = await app.inject({
        method: 'PUT',
        url: '/api/barbershop',
        headers: {
          'x-tenant-slug': barbershopSlug,
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          isActive: false,
        },
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(data.isActive).toBe(false)
    })

    it('should reject update without auth (401)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/barbershop',
        headers: {
          'x-tenant-slug': barbershopSlug,
        },
        payload: {
          name: 'Novo Nome',
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should reject update with BARBER role (403)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/barbershop',
        headers: {
          'x-tenant-slug': barbershopSlug,
          authorization: `Bearer ${barberToken}`,
        },
        payload: {
          name: 'Novo Nome',
        },
      })

      expect(response.statusCode).toBe(403)
      const data = JSON.parse(response.body)
      expect(data.error).toContain('admin')
    })

    it('should validate input (400)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/barbershop',
        headers: {
          'x-tenant-slug': barbershopSlug,
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: '', // Empty name not allowed
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })
})
