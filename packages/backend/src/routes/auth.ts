import type { FastifyInstance } from 'fastify'
import { authController } from '../controllers/authController.js'
import { redis } from '../lib/redis.js'

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/auth/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              professional: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  role: { type: 'string', enum: ['ADMIN', 'BARBER'] },
                },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    authController.login.bind(authController)
  )

  app.post(
    '/auth/refresh',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    authController.refresh.bind(authController)
  )

  app.post(
    '/auth/logout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Logout',
        response: {
          200: { type: 'object', properties: { message: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    authController.logout.bind(authController)
  )

  app.post(
    '/auth/request-otp',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Request OTP',
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
        response: {
          200: { type: 'object', properties: { message: { type: 'string' } } },
        },
      },
    },
    authController.requestOTP.bind(authController)
  )

  app.post(
    '/auth/verify-otp',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Verify OTP',
        body: {
          type: 'object',
          required: ['email', 'otp'],
          properties: {
            email: { type: 'string', format: 'email' },
            otp: { type: 'string', minLength: 6, maxLength: 6 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              professional: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  role: { type: 'string', enum: ['ADMIN', 'BARBER'] },
                },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    authController.verifyOTP.bind(authController)
  )

  // Test-only OTP retrieval endpoint (disabled in production and behind explicit flag)
  if (process.env.ENABLE_TEST_OTP_ENDPOINT === 'true' && process.env.NODE_ENV !== 'production') {
    const OTP_PREFIX = 'barbershop:otp'

    app.get(
      '/auth/test/otp/:identifier',
      {
        schema: {
          tags: ['Auth - Test Only'],
          summary: '[TEST ONLY] Retrieve OTP for E2E tests',
          description:
            'Accessible only when ENABLE_TEST_OTP_ENDPOINT=true and NODE_ENV is not production. Retrieves OTP for the current tenant.',
          params: {
            type: 'object',
            required: ['identifier'],
            properties: {
              identifier: { type: 'string', description: 'Email used to request OTP' },
            },
          },
          response: {
            200: {
              type: 'object',
              properties: {
                otp: { type: 'string' },
                expiresIn: { type: 'number' },
              },
            },
            400: { type: 'object', properties: { error: { type: 'string' } } },
            404: { type: 'object', properties: { error: { type: 'string' } } },
          },
        },
      },
      async (request, reply) => {
        const tenantId = request.tenantId
        if (!tenantId) {
          return reply.code(400).send({ error: 'Tenant context required' })
        }

        const { identifier } = request.params as { identifier: string }
        const key = `${OTP_PREFIX}:${tenantId}:${identifier}`
        const otpRaw = await redis.get(key)
        const otp = otpRaw === null ? null : String(otpRaw)

        if (!otp) {
          return reply.code(404).send({ error: 'OTP not found or expired' })
        }

        const ttlSeconds = typeof redis.ttl === 'function' ? await redis.ttl(key) : null

        return {
          otp,
          expiresIn: ttlSeconds && ttlSeconds > 0 ? ttlSeconds : 0,
        }
      }
    )

    // Visible warning in non-production to avoid accidental exposure
    console.warn('⚠️  TEST OTP ENDPOINT ENABLED - /auth/test/otp/:identifier (non-production only)')
  }
}
