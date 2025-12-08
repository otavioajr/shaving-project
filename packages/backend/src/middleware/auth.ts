import type { FastifyRequest, FastifyReply } from 'fastify'

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Verify JWT token
    await request.jwtVerify()

    // JWT payload is now available as request.user
    // (set by @fastify/jwt plugin)
  } catch (error) {
    // Token verification failed - user is not authenticated
    // Don't reply here, let the route handler decide what to do
    // Some routes are public, others require auth
  }
}
