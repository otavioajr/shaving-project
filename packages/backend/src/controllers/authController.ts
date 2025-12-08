import type { FastifyRequest, FastifyReply } from 'fastify'
import { authService } from '../services/authService.js'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const otpRequestSchema = z.object({
  email: z.string().email(),
})

const otpVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
})

export class AuthController {
  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = loginSchema.parse(request.body)
      const barbershopId = (request as any).tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      const result = await authService.login({ ...data, barbershopId })

      // Generate JWT tokens
      const accessToken = request.server.jwt.sign(
        { id: result.professional.id, email: result.professional.email, barbershopId, role: result.professional.role } as any,
        { expiresIn: '15m' }
      )

      const refreshTokenPayload = { id: result.professional.id, email: result.professional.email, barbershopId, role: result.professional.role }
      const refreshToken = request.server.jwt.sign(refreshTokenPayload as any, { expiresIn: '7d' })

      // Store refresh token in Redis
      await authService.saveRefreshToken(result.professional.id, barbershopId, refreshToken)

      // Set HTTP-only cookie
      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 604800, // 7 days
      })

      return reply.status(200).send({
        accessToken,
        refreshToken,
        professional: result.professional,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      if (error instanceof Error && error.message.includes('Invalid credentials')) {
        return reply.status(401).send({ error: 'Invalid credentials' })
      }
      throw error
    }
  }

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { refreshToken } = refreshSchema.parse(request.body)
      const barbershopId = (request as any).tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      // Verify refresh token
      let payload: any
      try {
        payload = request.server.jwt.verify(refreshToken)
      } catch (error) {
        return reply.status(401).send({ error: 'Invalid refresh token' })
      }

      if (!payload) {
        return reply.status(401).send({ error: 'Invalid refresh token' })
      }

      // Check if token exists in Redis
      const stored = await authService.getRefreshToken(payload.id, barbershopId)
      if (!stored || stored !== refreshToken) {
        return reply.status(401).send({ error: 'Refresh token expired or revoked' })
      }

      // Generate new access token
      const newAccessToken = request.server.jwt.sign(
        { id: payload.id, email: payload.email, barbershopId, role: payload.role } as any,
        { expiresIn: '15m' }
      )

      return reply.status(200).send({ accessToken: newAccessToken })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      return reply.status(401).send({ error: 'Invalid token' })
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const barbershopId = (request as any).tenantId
      const userId = (request as any).user?.id

      if (!barbershopId || !userId) {
        return reply.status(401).send({ error: 'Not authenticated' })
      }

      // Remove refresh token from Redis
      await authService.deleteRefreshToken(userId, barbershopId)

      // Clear cookie
      reply.clearCookie('refreshToken')

      return reply.status(200).send({ message: 'Logged out successfully' })
    } catch (error) {
      throw error
    }
  }

  async requestOTP(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = otpRequestSchema.parse(request.body)
      const barbershopId = (request as any).tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      await authService.requestOTP(data.email, barbershopId)

      return reply.status(200).send({ message: 'OTP sent to email' })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      throw error
    }
  }

  async verifyOTP(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = otpVerifySchema.parse(request.body)
      const barbershopId = (request as any).tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      const valid = await authService.verifyOTP(data.email, barbershopId, data.otp)

      if (!valid) {
        return reply.status(401).send({ error: 'Invalid OTP' })
      }

      return reply.status(200).send({ message: 'OTP verified successfully' })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      throw error
    }
  }
}

export const authController = new AuthController()
