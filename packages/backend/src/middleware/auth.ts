import type { FastifyRequest, FastifyReply } from 'fastify'
import type { AuthenticatedUser } from '../types/index.js'

/**
 * Middleware that attempts JWT verification but doesn't block on failure.
 * Use for routes where authentication is optional or will be checked in the controller.
 */
export async function authMiddleware(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    // Verify JWT token
    await request.jwtVerify()
    // JWT payload is now available as request.user
  } catch {
    // Token verification failed - user is not authenticated
    // Don't reply here, let the route handler decide what to do
    // Some routes are public, others require auth
  }
}

/**
 * Middleware that REQUIRES a valid JWT token.
 * Use for routes that must be authenticated (create, update, delete operations).
 * Returns 401 if no valid token is present.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Authentication required' })
  }
}

/**
 * Helper function to check if user is authenticated in controller.
 * Returns the user object or null if not authenticated.
 */
export function getAuthenticatedUser(request: FastifyRequest): AuthenticatedUser | null {
  const user = request.user
  if (!user?.id) {
    return null
  }
  return user
}
