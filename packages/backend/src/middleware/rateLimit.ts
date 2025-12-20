import type { FastifyRequest, FastifyReply } from 'fastify'
import { ipRatelimit, tenantRatelimit } from '../lib/redis.js'

const PUBLIC_ROUTES = ['/health', '/docs', '/']

export async function rateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const setRateLimitHeaders = (limit: { limit: number; remaining: number; reset: number }) => {
    reply.header('X-RateLimit-Limit', limit.limit.toString())
    reply.header('X-RateLimit-Remaining', limit.remaining.toString())
    reply.header('X-RateLimit-Reset', new Date(limit.reset).toISOString())
  }

  // Skip rate limiting for public routes
  const path = (request.url || request.raw?.url || '/').split('?')[0] // Remove query string

  // Check if path is exactly in PUBLIC_ROUTES or starts with /docs
  if (PUBLIC_ROUTES.includes(path) || path.startsWith('/docs')) {
    return
  }

  // Get client IP
  const clientIp =
    (request.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    (request.headers['x-real-ip'] as string | undefined) ||
    request.ip ||
    'unknown'

  // Rate limit by IP
  const ipLimit = await ipRatelimit.limit(clientIp)

  if (!ipLimit.success) {
    setRateLimitHeaders(ipLimit)
    reply.status(429).send({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    })
    return
  }

  let activeLimit = ipLimit

  // Rate limit by tenant (if tenant is available)
  if (request.tenantId) {
    const tenantLimit = await tenantRatelimit.limit(request.tenantId)

    if (!tenantLimit.success) {
      setRateLimitHeaders(tenantLimit)
      reply.status(429).send({
        error: 'Too Many Requests',
        message: 'Tenant rate limit exceeded. Please try again later.',
      })
      return
    }

    // Prefer tenant limits for responses when tenant is present
    activeLimit = tenantLimit
  }

  // Add rate limit headers based on the active scope (tenant or IP)
  setRateLimitHeaders(activeLimit)
}
