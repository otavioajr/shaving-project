import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock do Redis
vi.mock('@upstash/redis', () => {
  const mockRedis = {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
  }

  return {
    Redis: vi.fn(() => mockRedis),
    Ratelimit: vi.fn(() => ({
      limit: vi.fn().mockResolvedValue({ success: true, limit: 100, remaining: 99, reset: 0 }),
    })),
  }
})

describe('Redis Client & Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Redis Instance', () => {
    it('should create Redis client with URL and token from env', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { redis } = await import('../lib/redis')

      expect(redis).toBeDefined()
    })

    it('should log warning if credentials are missing in non-test environment', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      process.env.NODE_ENV = 'development'
      process.env.UPSTASH_REDIS_REST_URL = ''
      process.env.UPSTASH_REDIS_REST_TOKEN = ''

      vi.resetModules()
      await import('../lib/redis')

      expect(warnSpy).toHaveBeenCalledWith('Missing Upstash Redis credentials. Rate limiting will not work.')
      warnSpy.mockRestore()
    })
  })

  describe('OTP Helpers', () => {
    it('should store OTP with correct key format', async () => {
      const { storeOTP, redis } = await import('../lib/redis')

      await storeOTP('barbershop-1', 'user@example.com', '123456')

      expect(redis.set).toHaveBeenCalledWith(
        'barbershop:otp:barbershop-1:user@example.com',
        '123456',
        expect.objectContaining({ ex: 300 })
      )
    })

    it('should verify OTP correctly', async () => {
      const { verifyOTP, redis } = await import('../lib/redis')

      const mockGet = redis.get as unknown as ReturnType<typeof vi.fn>
      mockGet.mockResolvedValueOnce('123456')

      const result = await verifyOTP('barbershop-1', 'user@example.com', '123456')

      expect(result).toBe(true)
      expect(redis.del).toHaveBeenCalledWith('barbershop:otp:barbershop-1:user@example.com')
    })

    it('should return false for incorrect OTP', async () => {
      const { verifyOTP, redis } = await import('../lib/redis')

      const mockGet = redis.get as unknown as ReturnType<typeof vi.fn>
      mockGet.mockResolvedValueOnce('654321')

      const result = await verifyOTP('barbershop-1', 'user@example.com', '123456')

      expect(result).toBe(false)
    })

    it('should delete OTP', async () => {
      const { deleteOTP, redis } = await import('../lib/redis')

      await deleteOTP('barbershop-1', 'user@example.com')

      expect(redis.del).toHaveBeenCalledWith('barbershop:otp:barbershop-1:user@example.com')
    })
  })

  describe('Refresh Token Helpers', () => {
    it('should store refresh token with metadata', async () => {
      const { storeRefreshToken, redis } = await import('../lib/redis')
      const metadata = { createdAt: Date.now(), expiresAt: Date.now() + 86400000 }

      await storeRefreshToken('prof-1', 'token-id-1', metadata)

      expect(redis.set).toHaveBeenCalledWith(
        'barbershop:refresh:prof-1:token-id-1',
        JSON.stringify(metadata),
        expect.objectContaining({ ex: 604800 })
      )
    })

    it('should get refresh token', async () => {
      const { getRefreshToken, redis } = await import('../lib/redis')
      const metadata = { createdAt: Date.now(), expiresAt: Date.now() + 86400000 }

      const mockGet = redis.get as unknown as ReturnType<typeof vi.fn>
      mockGet.mockResolvedValueOnce(JSON.stringify(metadata))

      const result = await getRefreshToken('prof-1', 'token-id-1')

      expect(result).toEqual(metadata)
    })

    it('should return null if refresh token not found', async () => {
      const { getRefreshToken, redis } = await import('../lib/redis')

      const mockGet = redis.get as unknown as ReturnType<typeof vi.fn>
      mockGet.mockResolvedValueOnce(null)

      const result = await getRefreshToken('prof-1', 'token-id-1')

      expect(result).toBeNull()
    })

    it('should delete refresh token', async () => {
      const { deleteRefreshToken, redis } = await import('../lib/redis')

      await deleteRefreshToken('prof-1', 'token-id-1')

      expect(redis.del).toHaveBeenCalledWith('barbershop:refresh:prof-1:token-id-1')
    })

    it('should delete all refresh tokens for a professional', async () => {
      const { deleteAllRefreshTokens, redis } = await import('../lib/redis')

      const mockKeys = redis.keys as unknown as ReturnType<typeof vi.fn>
      mockKeys.mockResolvedValueOnce(['token-1', 'token-2', 'token-3'])

      await deleteAllRefreshTokens('prof-1')

      expect(redis.del).toHaveBeenCalledWith('token-1', 'token-2', 'token-3')
    })
  })

  describe('Tenant Cache Helpers', () => {
    it('should cache tenant', async () => {
      const { cacheTenant, redis } = await import('../lib/redis')

      await cacheTenant('my-barbershop', 'barbershop-id-1')

      expect(redis.set).toHaveBeenCalledWith(
        'barbershop:tenant:my-barbershop',
        'barbershop-id-1',
        expect.objectContaining({ ex: 300 })
      )
    })

    it('should get cached tenant', async () => {
      const { getCachedTenant, redis } = await import('../lib/redis')

      const mockGet = redis.get as unknown as ReturnType<typeof vi.fn>
      mockGet.mockResolvedValueOnce('barbershop-id-1')

      const result = await getCachedTenant('my-barbershop')

      expect(result).toBe('barbershop-id-1')
    })

    it('should return null if tenant not in cache', async () => {
      const { getCachedTenant, redis } = await import('../lib/redis')

      const mockGet = redis.get as unknown as ReturnType<typeof vi.fn>
      mockGet.mockResolvedValueOnce(null)

      const result = await getCachedTenant('my-barbershop')

      expect(result).toBeNull()
    })

    it('should invalidate tenant cache', async () => {
      const { invalidateTenantCache, redis } = await import('../lib/redis')

      await invalidateTenantCache('my-barbershop')

      expect(redis.del).toHaveBeenCalledWith('barbershop:tenant:my-barbershop')
    })
  })

  describe('Rate Limiters', () => {
    it('should export IP rate limiter', async () => {
      const { ipRatelimit } = await import('../lib/redis')

      expect(ipRatelimit).toBeDefined()
    })

    it('should export tenant rate limiter', async () => {
      const { tenantRatelimit } = await import('../lib/redis')

      expect(tenantRatelimit).toBeDefined()
    })
  })

  describe('Default Export', () => {
    it('should export redis as default', async () => {
      const redisModule = await import('../lib/redis')

      expect(redisModule.default).toBeDefined()
      expect(redisModule.default).toBe(redisModule.redis)
    })
  })
})
