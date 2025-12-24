import type { FastifyRequest, FastifyReply } from 'fastify'
import type { AuthenticatedUser } from '../types/index.js'
import { barbershopService } from '../services/barbershopService.js'
import { authService } from '../services/authService.js'
import { selfRegisterSchema, updateBarbershopSchema } from '../schemas/barbershop.schema.js'
import { z } from 'zod'

export class BarbershopController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = selfRegisterSchema.parse(request.body)

      const result = await barbershopService.selfRegister(data)

      // Generate JWT tokens (same pattern as authController)
      const accessTokenPayload: AuthenticatedUser = {
        id: result.admin.id,
        email: result.admin.email,
        barbershopId: result.barbershop.id,
        role: 'ADMIN',
      }
      const accessToken = request.server.jwt.sign(accessTokenPayload, { expiresIn: '15m' })

      const refreshTokenPayload: AuthenticatedUser = {
        id: result.admin.id,
        email: result.admin.email,
        barbershopId: result.barbershop.id,
        role: 'ADMIN',
      }
      const refreshToken = request.server.jwt.sign(refreshTokenPayload, { expiresIn: '7d' })

      // Store refresh token in Redis
      await authService.saveRefreshToken(result.admin.id, result.barbershop.id, refreshToken)

      // Set HTTP-only cookie
      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 604800, // 7 days
      })

      return reply.status(201).send({
        barbershop: result.barbershop,
        admin: result.admin,
        accessToken,
        refreshToken,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      if (error instanceof Error && error.message.includes('already in use')) {
        return reply.status(409).send({ error: error.message })
      }
      if (error instanceof Error && error.message.includes('already registered')) {
        return reply.status(409).send({ error: error.message })
      }
      if (error instanceof Error && error.message.startsWith('Slug must')) {
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  }

  async getPublicInfo(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string }

    const info = await barbershopService.getPublicInfo(slug)

    if (!info) {
      return reply.status(404).send({ error: 'Barbershop not found' })
    }

    return reply.status(200).send(info)
  }

  async get(request: FastifyRequest, reply: FastifyReply) {
    const barbershopId = request.tenantId
    const user = request.user as AuthenticatedUser | undefined

    if (!barbershopId) {
      return reply.status(401).send({ error: 'Tenant not identified' })
    }

    if (!user?.id) {
      return reply.status(401).send({ error: 'Authentication required' })
    }

    if (user.barbershopId !== barbershopId) {
      return reply.status(403).send({ error: 'Tenant mismatch' })
    }

    const barbershop = await barbershopService.getBarbershop(barbershopId)

    if (!barbershop) {
      return reply.status(404).send({ error: 'Barbershop not found' })
    }

    return reply.status(200).send(barbershop)
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = updateBarbershopSchema.parse(request.body)
      const barbershopId = request.tenantId
      const user = request.user as AuthenticatedUser | undefined

      // Validate tenant identification
      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      // Validate authentication
      if (!user?.id) {
        return reply.status(401).send({ error: 'Authentication required' })
      }

      // Validate tenant match
      if (user.barbershopId !== barbershopId) {
        return reply.status(403).send({ error: 'Tenant mismatch' })
      }

      // Validate ADMIN role
      if (user.role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Only admins can update barbershop' })
      }

      const barbershop = await barbershopService.updateBarbershop(barbershopId, data)
      return reply.status(200).send(barbershop)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message })
      }
      throw error
    }
  }
}

export const barbershopController = new BarbershopController()
