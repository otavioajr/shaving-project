import { describe, it, expect, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../app.js'
import { prisma } from '../../lib/prisma.js'

describe(
  'Barbershop Endpoints',
  {
    timeout: 60000,
  },
  () => {
    let app: FastifyInstance

    beforeEach(async () => {
      app = await buildApp()
    })

    describe('POST /api/barbershops - Self-registration', () => {
      it('should create a new barbershop with valid data (201)', async () => {
        const timestamp = Date.now()
        const slug = `nova-barbearia-${timestamp}`
        const email = `admin-${timestamp}@nova.com`
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
        // First registration
        await app.inject({
          method: 'POST',
          url: '/api/barbershops',
          payload: {
            name: 'Barbearia Um',
            slug: `barbearia-um-${timestamp}`,
            adminEmail: `admin1-${timestamp}@test.com`,
            adminPassword: 'senhasegura123',
            adminName: 'Admin Um',
          },
        })

        // Duplicate attempt
        const response = await app.inject({
          method: 'POST',
          url: '/api/barbershops',
          payload: {
            name: 'Barbearia Dois',
            slug: `barbearia-um-${timestamp}`, // Same slug
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
        // First registration
        const email = `admin-global-${timestamp}@test.com`
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
      let barbershopSlug: string

      beforeEach(async () => {
        const timestamp = Date.now()
        barbershopSlug = `barbearia-publica-${timestamp}`
        await app.inject({
          method: 'POST',
          url: '/api/barbershops',
          payload: {
            name: 'Barbearia Publica',
            slug: barbershopSlug,
            adminEmail: `admin-${timestamp}@publica.com`,
            adminPassword: 'senhasegura123',
            adminName: 'Admin',
          },
        })
      })

      it('should return public info for valid slug (200)', async () => {
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
        const response = await app.inject({
          method: 'GET',
          url: '/api/barbershops/nao-existe',
        })

        expect(response.statusCode).toBe(404)
      })

      it('should return 404 for inactive barbershop', async () => {
        // Deactivate barbershop
        await prisma.barbershop.update({
          where: { slug: barbershopSlug },
          data: { isActive: false },
        })

        const inactiveResponse = await app.inject({
          method: 'GET',
          url: `/api/barbershops/${barbershopSlug}`,
        })

        expect(inactiveResponse.statusCode).toBe(404)
      })

      it('should not expose sensitive data in public info', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/api/barbershops/${barbershopSlug}`,
        })

        const data = JSON.parse(response.body)
        expect(data.createdAt).toBeUndefined()
        expect(data.updatedAt).toBeUndefined()
      })
    })

    describe('PUT /api/barbershop - Update Current Tenant', () => {
      let barbershopSlug: string
      let adminToken: string
      let barberToken: string

      beforeEach(async () => {
        // Create barbershop with admin
        const timestamp = Date.now()
        const uniqueSlug = `barbearia-update-${timestamp}`
        const uniqueEmail = `admin-${timestamp}@update.com`
        const barberEmail = `barber-${timestamp}@update.com`

        const registerResponse = await app.inject({
          method: 'POST',
          url: '/api/barbershops',
          payload: {
            name: 'Barbearia Update Test',
            slug: uniqueSlug,
            adminEmail: uniqueEmail,
            adminPassword: 'senhasegura123',
            adminName: 'Admin Update',
          },
        })
        barbershopSlug = uniqueSlug
        const registerData = JSON.parse(registerResponse.body)
        adminToken = registerData.accessToken

        // Create barber user
        const loginResponse = await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          headers: { 'x-tenant-slug': barbershopSlug },
          payload: {
            email: uniqueEmail,
            password: 'senhasegura123',
          },
        })
        const loginData = JSON.parse(loginResponse.body)

        // Create a barber
        await app.inject({
          method: 'POST',
          url: '/api/professionals',
          headers: {
            'x-tenant-slug': barbershopSlug,
            authorization: `Bearer ${loginData.accessToken}`,
          },
          payload: {
            name: 'Barber Test',
            email: barberEmail,
            password: 'senhasegura123',
            commissionRate: 0.3,
            role: 'BARBER',
          },
        })

        // Login as barber
        const barberLoginResponse = await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          headers: { 'x-tenant-slug': barbershopSlug },
          payload: {
            email: barberEmail,
            password: 'senhasegura123',
          },
        })
        const barberLoginData = JSON.parse(barberLoginResponse.body)
        barberToken = barberLoginData.accessToken
      })

      it('should update name with ADMIN role (200)', async () => {
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
  }
)
