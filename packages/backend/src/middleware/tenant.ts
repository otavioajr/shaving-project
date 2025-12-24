import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { getCachedTenant, cacheTenant } from '../lib/redis.js'

const PUBLIC_ROUTES = ['/health', '/docs', '/']

export async function tenantMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip middleware for public routes
  const path = (request.url ?? '/').split('?')[0] // Remove query string

  // Check if path is exactly in PUBLIC_ROUTES or starts with /docs or /api/cron
  if (PUBLIC_ROUTES.includes(path) || path.startsWith('/docs') || path.startsWith('/api/cron')) {
    return
  }

  // Skip tenant check for public barbershop endpoints
  if (path === '/api/barbershops' && request.method === 'POST') {
    return
  }
  if (path.match(/^\/api\/barbershops\/[a-z0-9-]+$/)) {
    return
  }

  // Get tenant slug from header
  const tenantSlug = request.headers['x-tenant-slug'] as string | undefined

  if (!tenantSlug) {
    return reply.status(404).send({
      error: 'Tenant not found',
      message: 'Missing x-tenant-slug header',
    })
  }

  // Try to get tenant from cache first
  let tenantId = await getCachedTenant(tenantSlug)

  if (!tenantId) {
    // Cache miss - query database
    const barbershop = await prisma.barbershop.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, isActive: true },
    })

    if (!barbershop) {
      return reply.status(404).send({
        error: 'Tenant not found',
        message: `Barbershop with slug "${tenantSlug}" does not exist`,
      })
    }

    if (!barbershop.isActive) {
      return reply.status(404).send({
        error: 'Tenant not found',
        message: `Barbershop with slug "${tenantSlug}" is inactive`,
      })
    }

    tenantId = barbershop.id

    // Cache the tenant for future requests
    await cacheTenant(tenantSlug, tenantId)
  }

  // Inject tenant info into request
  request.tenantId = tenantId
  request.tenantSlug = tenantSlug

  // Note: RLS policies will use application-level filtering via barbershopId
  // Setting session variables requires transactions, which is not practical
  // for all queries. The primary isolation is enforced by filtering all
  // database queries by barbershopId in the application code.
}
