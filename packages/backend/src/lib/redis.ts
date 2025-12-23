import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('Missing Upstash Redis credentials. Rate limiting will not work.')
  }
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

// Rate limiter: 100 requests per 60 seconds per IP
export const ipRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '60 s'),
  analytics: true,
  prefix: 'barbershop:ratelimit:ip',
})

// Tenant rate limiter: 1000 requests per minute per tenant
export const tenantRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1000, '60 s'),
  analytics: true,
  prefix: 'barbershop:ratelimit:tenant',
})

// OTP storage helpers
const OTP_TTL = 300 // 5 minutes in seconds
const OTP_PREFIX = 'barbershop:otp'

export async function storeOTP(barbershopId: string, email: string, code: string): Promise<void> {
  const key = `${OTP_PREFIX}:${barbershopId}:${email}`
  await redis.set(key, code, { ex: OTP_TTL })
}

export async function verifyOTP(
  barbershopId: string,
  email: string,
  code: string
): Promise<boolean> {
  const key = `${OTP_PREFIX}:${barbershopId}:${email}`
  const storedCodeRaw = await redis.get(key)
  const storedCode = storedCodeRaw === null ? null : String(storedCodeRaw)

  if (storedCode === code) {
    await redis.del(key) // Delete after successful verification
    return true
  }

  return false
}

export async function deleteOTP(barbershopId: string, email: string): Promise<void> {
  const key = `${OTP_PREFIX}:${barbershopId}:${email}`
  await redis.del(key)
}

// Refresh token storage helpers
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 7 // 7 days in seconds
const REFRESH_TOKEN_PREFIX = 'barbershop:refresh'

export async function storeRefreshToken(
  professionalId: string,
  tokenId: string,
  metadata: { createdAt: number; expiresAt: number }
): Promise<void> {
  const key = `${REFRESH_TOKEN_PREFIX}:${professionalId}:${tokenId}`
  await redis.set(key, JSON.stringify(metadata), { ex: REFRESH_TOKEN_TTL })
}

export async function getRefreshToken(
  professionalId: string,
  tokenId: string
): Promise<{ createdAt: number; expiresAt: number } | null> {
  const key = `${REFRESH_TOKEN_PREFIX}:${professionalId}:${tokenId}`
  const data = await redis.get(key)
  if (!data) return null
  if (typeof data === 'string') return JSON.parse(data)
  return data as { createdAt: number; expiresAt: number }
}

export async function deleteRefreshToken(professionalId: string, tokenId: string): Promise<void> {
  const key = `${REFRESH_TOKEN_PREFIX}:${professionalId}:${tokenId}`
  await redis.del(key)
}

export async function deleteAllRefreshTokens(professionalId: string): Promise<void> {
  const pattern = `${REFRESH_TOKEN_PREFIX}:${professionalId}:*`
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}

// Tenant cache helpers
const TENANT_CACHE_TTL = 60 * 5 // 5 minutes
const TENANT_CACHE_PREFIX = 'barbershop:tenant'

export async function cacheTenant(slug: string, tenantId: string): Promise<void> {
  const key = `${TENANT_CACHE_PREFIX}:${slug}`
  await redis.set(key, tenantId, { ex: TENANT_CACHE_TTL })
}

export async function getCachedTenant(slug: string): Promise<string | null> {
  const key = `${TENANT_CACHE_PREFIX}:${slug}`
  return await redis.get<string>(key)
}

export async function invalidateTenantCache(slug: string): Promise<void> {
  const key = `${TENANT_CACHE_PREFIX}:${slug}`
  await redis.del(key)
}

export default redis
