import type { FastifyInstance } from 'fastify'
import { barbershopController } from '../controllers/barbershopController.js'
import { requireAuth } from '../middleware/auth.js'

export async function barbershopRoutes(app: FastifyInstance) {
  // POST /barbershops - Self-registration (public)
  app.post(
    '/barbershops',
    {
      schema: {
        tags: ['Barbershops'],
        summary: 'Register a new barbershop (self-registration)',
        description: 'Create a new barbershop and first admin user',
        body: {
          type: 'object',
          required: ['name', 'slug', 'adminEmail', 'adminPassword', 'adminName'],
          properties: {
            name: { type: 'string', minLength: 1 },
            slug: {
              type: 'string',
              pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
              minLength: 3,
              maxLength: 50,
            },
            adminEmail: { type: 'string', format: 'email' },
            adminPassword: { type: 'string', minLength: 8 },
            adminName: { type: 'string', minLength: 1 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              barbershop: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  isActive: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
              admin: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' }, details: {} } },
          409: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    barbershopController.register.bind(barbershopController)
  )

  // GET /barbershops/:slug - Get barbershop public info (public)
  app.get(
    '/barbershops/:slug',
    {
      schema: {
        tags: ['Barbershops'],
        summary: 'Get barbershop public information',
        description: 'Retrieve public barbershop info by slug (no authentication required)',
        params: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
              isActive: { type: 'boolean' },
            },
          },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    barbershopController.getPublicInfo.bind(barbershopController)
  )

  // GET /barbershop - Get current barbershop data (protected)
  app.get(
    '/barbershop',
    {
      preHandler: requireAuth,
      schema: {
        tags: ['Barbershops'],
        summary: 'Get current barbershop data',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    barbershopController.get.bind(barbershopController)
  )

  // PUT /barbershop - Update barbershop data (protected, ADMIN only)
  app.put(
    '/barbershop',
    {
      preHandler: requireAuth,
      schema: {
        tags: ['Barbershops'],
        summary: 'Update barbershop data (ADMIN only)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' }, details: {} } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    barbershopController.update.bind(barbershopController)
  )
}
