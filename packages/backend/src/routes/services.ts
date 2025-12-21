import type { FastifyInstance } from 'fastify'
import { serviceController } from '../controllers/serviceController.js'
import { requireAuth } from '../middleware/auth.js'

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    details: { type: 'array' },
  },
  additionalProperties: true,
} as const

export async function serviceRoutes(app: FastifyInstance) {
  app.get(
    '/services',
    {
      preHandler: requireAuth,
      schema: {
        tags: ['Services'],
        summary: 'List all services',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    price: { type: 'number' },
                    duration: { type: 'number' },
                    isActive: { type: 'boolean' },
                    barbershopId: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  total: { type: 'number' },
                  totalPages: { type: 'number' },
                },
              },
            },
          },
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    serviceController.list.bind(serviceController)
  )

  app.get(
    '/services/:id',
    {
      preHandler: requireAuth,
      schema: {
        tags: ['Services'],
        summary: 'Get service by ID',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              price: { type: 'number' },
              duration: { type: 'number' },
              isActive: { type: 'boolean' },
              barbershopId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          404: { type: 'object', properties: { error: { type: 'string' } } },
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    serviceController.getById.bind(serviceController)
  )

  app.post(
    '/services',
    {
      preHandler: requireAuth,
      schema: {
        tags: ['Services'],
        summary: 'Create new service',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'price', 'duration'],
          properties: {
            name: { type: 'string', minLength: 1 },
            price: { type: 'number', minimum: 0 },
            duration: { type: 'number', minimum: 1 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              price: { type: 'number' },
              duration: { type: 'number' },
              isActive: { type: 'boolean' },
              barbershopId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    serviceController.create.bind(serviceController)
  )

  app.put(
    '/services/:id',
    {
      preHandler: requireAuth,
      schema: {
        tags: ['Services'],
        summary: 'Update service',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            price: { type: 'number', minimum: 0 },
            duration: { type: 'number', minimum: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              price: { type: 'number' },
              duration: { type: 'number' },
              isActive: { type: 'boolean' },
              barbershopId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          404: { type: 'object', properties: { error: { type: 'string' } } },
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    serviceController.update.bind(serviceController)
  )

  app.delete(
    '/services/:id',
    {
      preHandler: requireAuth,
      schema: {
        tags: ['Services'],
        summary: 'Delete service',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          204: { type: 'null' },
          404: { type: 'object', properties: { error: { type: 'string' } } },
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    serviceController.delete.bind(serviceController)
  )
}
