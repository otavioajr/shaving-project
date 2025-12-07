import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { tenantMiddleware } from './middleware/tenant.js'
import { rateLimitMiddleware } from './middleware/rateLimit.js'

export interface AppOptions {
  logger?: boolean
}

export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? process.env.NODE_ENV !== 'production',
  })

  // Register CORS
  await app.register(cors, {
    origin: true,
    credentials: true,
  })

  // Register Cookie support
  await app.register(cookie, {
    secret: process.env.JWT_SECRET,
  })

  // Register JWT
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'development-secret-min-32-chars-long',
    sign: {
      expiresIn: '15m', // Access token: 15 minutes
    },
  })

  // Register Swagger for API documentation
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Barbershop SaaS API',
        description: 'Multi-tenant Barbershop Management API',
        version: '1.0.0',
      },
      servers: [
        {
          url: process.env.API_URL || 'http://localhost:3000',
          description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Professionals', description: 'Professional management' },
        { name: 'Clients', description: 'Client management' },
        { name: 'Services', description: 'Service management' },
        { name: 'Appointments', description: 'Appointment management' },
        { name: 'Transactions', description: 'Financial transactions' },
        { name: 'Reports', description: 'Financial reports' },
        { name: 'Barbershops', description: 'Barbershop/tenant management' },
      ],
    },
  })

  // Register Swagger UI
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  })

  // Register global middlewares
  // Order matters: tenant validation first, then rate limiting
  app.addHook('onRequest', tenantMiddleware)
  app.addHook('onRequest', rateLimitMiddleware)

  // Health check endpoint (public, no tenant required)
  app.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the health status of the API',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok'] },
              timestamp: { type: 'string', format: 'date-time' },
              environment: { type: 'string' },
            },
          },
        },
      },
    },
    async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      }
    }
  )

  // Root endpoint
  app.get(
    '/',
    {
      schema: {
        hide: true,
      },
    },
    async () => {
      return {
        name: 'Barbershop SaaS API',
        version: '1.0.0',
        docs: '/docs',
      }
    }
  )

  return app
}

export default buildApp
