import type { FastifyInstance } from 'fastify'
import { serviceController } from '../controllers/serviceController.js'

export async function serviceRoutes(app: FastifyInstance) {
  app.get(
    '/services',
    {
      schema: {
        tags: ['Services'],
        summary: 'List all services',
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
        },
      },
    },
    serviceController.list.bind(serviceController)
  )

  app.get(
    '/services/:id',
    {
      schema: {
        tags: ['Services'],
        summary: 'Get service by ID',
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
        },
      },
    },
    serviceController.getById.bind(serviceController)
  )

  app.post(
    '/services',
    {
      schema: {
        tags: ['Services'],
        summary: 'Create new service',
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
        },
      },
    },
    serviceController.create.bind(serviceController)
  )

  app.put(
    '/services/:id',
    {
      schema: {
        tags: ['Services'],
        summary: 'Update service',
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
        },
      },
    },
    serviceController.update.bind(serviceController)
  )

  app.delete(
    '/services/:id',
    {
      schema: {
        tags: ['Services'],
        summary: 'Delete service',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          204: { type: 'null' },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    serviceController.delete.bind(serviceController)
  )
}
