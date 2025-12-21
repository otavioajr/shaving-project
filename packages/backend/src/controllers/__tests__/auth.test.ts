import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import type { AuthenticatedUser } from '../../types/index.js'

const redisMock = {
  setex: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
  keys: vi.fn().mockResolvedValue([]),
}

const ipRatelimitMock = {
  limit: vi.fn().mockResolvedValue({ success: true, limit: 1000, remaining: 999, reset: Date.now() + 60000 }),
}

const tenantRatelimitMock = {
  limit: vi.fn().mockResolvedValue({ success: true, limit: 1000, remaining: 999, reset: Date.now() + 60000 }),
}

const getCachedTenant = vi.fn().mockResolvedValue('tenant-id')

vi.mock('../../lib/redis.js', () => ({
  redis: redisMock,
  default: redisMock,
  ipRatelimit: ipRatelimitMock,
  tenantRatelimit: tenantRatelimitMock,
  getCachedTenant,
  cacheTenant: vi.fn(),
  storeOTP: vi.fn(async (barbershopId: string, email: string, code: string) =>
    redisMock.setex(`barbershop:otp:${barbershopId}:${email}`, code, { ex: 300 })
  ),
  verifyOTP: vi.fn(),
  deleteOTP: vi.fn(),
  storeRefreshToken: vi.fn(),
  getRefreshToken: vi.fn(),
  deleteRefreshToken: vi.fn(),
  deleteAllRefreshTokens: vi.fn(),
  invalidateTenantCache: vi.fn(),
}))

const professionalFindFirst = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    professional: {
      findFirst: professionalFindFirst,
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

describe('Auth Controller', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    getCachedTenant.mockResolvedValue('tenant-id')
    redisMock.get.mockResolvedValue(null)
    redisMock.setex.mockResolvedValue('OK')
    redisMock.del.mockResolvedValue(1)
    app = await buildTestApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('should login with valid credentials', async () => {
    const passwordHash = await bcrypt.hash('senha123', 10)
    professionalFindFirst.mockResolvedValueOnce({
      id: 'prof-1',
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN',
      barbershopId: 'tenant-id',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'x-tenant-slug': 'barbearia-teste' },
      payload: { email: 'admin@example.com', password: 'senha123' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.accessToken).toBeDefined()
    expect(body.refreshToken).toBeDefined()
    expect(body.professional).toMatchObject({ id: 'prof-1', email: 'admin@example.com', role: 'ADMIN' })
    expect(redisMock.setex).toHaveBeenCalledWith(
      'barbershop:refresh:tenant-id:prof-1',
      604800,
      expect.any(String)
    )
  })

  it('should reject login with wrong password', async () => {
    const passwordHash = await bcrypt.hash('senha123', 10)
    professionalFindFirst.mockResolvedValueOnce({
      id: 'prof-1',
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN',
      barbershopId: 'tenant-id',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'x-tenant-slug': 'barbearia-teste' },
      payload: { email: 'admin@example.com', password: 'wrongpass' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('should send OTP when account exists and return 200 always', async () => {
    professionalFindFirst.mockResolvedValueOnce({
      id: 'prof-1',
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: 'hash',
      role: 'ADMIN',
      barbershopId: 'tenant-id',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/request-otp',
      headers: { 'x-tenant-slug': 'barbearia-teste' },
      payload: { email: 'admin@example.com' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toHaveProperty('message')
    expect(redisMock.setex).toHaveBeenCalled()
  })

  it('should verify OTP and return tokens', async () => {
    professionalFindFirst.mockResolvedValue({
      id: 'prof-1',
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: 'hash',
      role: 'ADMIN',
      barbershopId: 'tenant-id',
    })

    redisMock.get.mockResolvedValueOnce('123456')

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      headers: { 'x-tenant-slug': 'barbearia-teste' },
      payload: { email: 'admin@example.com', otp: '123456' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.accessToken).toBeDefined()
    expect(body.refreshToken).toBeDefined()
    expect(body.professional).toMatchObject({ id: 'prof-1', email: 'admin@example.com' })
  })

  it('should reject invalid OTP', async () => {
    professionalFindFirst.mockResolvedValue({
      id: 'prof-1',
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: 'hash',
      role: 'ADMIN',
      barbershopId: 'tenant-id',
    })

    redisMock.get.mockResolvedValueOnce('999999')

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      headers: { 'x-tenant-slug': 'barbearia-teste' },
      payload: { email: 'admin@example.com', otp: '123456' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('should refresh token when refresh token is valid and stored', async () => {
    const payload: AuthenticatedUser = {
      id: 'prof-1',
      email: 'admin@example.com',
      barbershopId: 'tenant-id',
      role: 'ADMIN',
    }
    const refreshToken = app.jwt.sign(payload, { expiresIn: '7d' })
    redisMock.get.mockResolvedValueOnce(refreshToken)

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { 'x-tenant-slug': 'barbearia-teste' },
      payload: { refreshToken },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().accessToken).toBeDefined()
  })

  it('should reject refresh when token is not stored', async () => {
    const payload: AuthenticatedUser = {
      id: 'prof-1',
      email: 'admin@example.com',
      barbershopId: 'tenant-id',
      role: 'ADMIN',
    }
    const refreshToken = app.jwt.sign(payload, { expiresIn: '7d' })
    redisMock.get.mockResolvedValueOnce(null)

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { 'x-tenant-slug': 'barbearia-teste' },
      payload: { refreshToken },
    })

    expect(response.statusCode).toBe(401)
  })

  it('should logout and revoke refresh token', async () => {
    const payload: AuthenticatedUser = {
      id: 'prof-1',
      email: 'admin@example.com',
      barbershopId: 'tenant-id',
      role: 'ADMIN',
    }
    const accessToken = app.jwt.sign(payload, { expiresIn: '15m' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-tenant-slug': 'barbearia-teste',
      },
    })

    expect(response.statusCode).toBe(200)

    expect(redisMock.del).toHaveBeenCalledWith('barbershop:refresh:tenant-id:prof-1')
  })
})
