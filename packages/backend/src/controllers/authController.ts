import type { FastifyRequest, FastifyReply } from 'fastify'
import { authService } from '../services/authService.js'
import {
  loginSchema,
  refreshSchema,
  otpRequestSchema,
  otpVerifySchema,
  type LoginInput,
  type OtpRequestInput,
  type OtpVerifyInput,
  type RefreshInput,
} from '../schemas/auth.schema.js'
import { ZodError } from 'zod'

export class AuthController {
  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = loginSchema.parse(request.body) as LoginInput
      const barbershopId = (request as any).tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      const result = await authService.login({ ...data, barbershopId })
      const professional = {
        id: result.professional.id,
        name: result.professional.name,
        email: result.professional.email,
        role: result.professional.role,
      }

      // Generate JWT tokens
      const accessToken = request.server.jwt.sign(
        { id: professional.id, email: professional.email, barbershopId, role: professional.role } as any,
        { expiresIn: '15m' }
      )

      const refreshTokenPayload = { id: professional.id, email: professional.email, barbershopId, role: professional.role }
      const refreshToken = request.server.jwt.sign(refreshTokenPayload as any, { expiresIn: '7d' })

      // Store refresh token in Redis
      await authService.saveRefreshToken(professional.id, barbershopId, refreshToken)

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
        professional,
      })
    } catch (error) {
      if (error instanceof ZodError) {
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
      const { refreshToken } = refreshSchema.parse(request.body) as RefreshInput
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

      if (payload.barbershopId !== barbershopId) {
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
      if (error instanceof ZodError) {
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
      const data = otpRequestSchema.parse(request.body) as OtpRequestInput
      const barbershopId = (request as any).tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      const professional = await authService.findProfessionalByEmail(data.email, barbershopId)
      if (professional) {
        await authService.requestOTP(data.email, barbershopId)
      }

      return reply.status(200).send({ message: 'If the account exists, an OTP was sent' })
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      throw error
    }
  }

  async verifyOTP(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = otpVerifySchema.parse(request.body) as OtpVerifyInput
      const barbershopId = (request as any).tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      const valid = await authService.verifyOTP(data.email, barbershopId, data.otp)

      if (!valid) {
        return reply.status(401).send({ error: 'Invalid OTP' })
      }

      const professional = await authService.findProfessionalByEmail(data.email, barbershopId)
      if (!professional) {
        return reply.status(401).send({ error: 'Invalid OTP' })
      }

      const payload = { id: professional.id, email: professional.email, barbershopId, role: professional.role }

      const accessToken = request.server.jwt.sign(payload as any, { expiresIn: '15m' })
      const refreshToken = request.server.jwt.sign(payload as any, { expiresIn: '7d' })

      await authService.saveRefreshToken(professional.id, barbershopId, refreshToken)

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 604800, // 7 days
      })

      return reply.status(200).send({
        accessToken,
        refreshToken,
        professional: {
          id: professional.id,
          name: professional.name,
          email: professional.email,
          role: professional.role,
        },
      })
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      throw error
    }
  }
}

export const authController = new AuthController()
