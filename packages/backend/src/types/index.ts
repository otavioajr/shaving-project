import type { FastifyRequest } from 'fastify'

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface AuthenticatedUser {
  id: string
  barbershopId: string
  email: string
  role: 'ADMIN' | 'BARBER'
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string
    tenantSlug: string
  }
}

// Extend @fastify/jwt types
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthenticatedUser
    user: AuthenticatedUser
  }
}

export type AuthenticatedRequest = FastifyRequest & {
  user: AuthenticatedUser
}
