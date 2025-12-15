import type { FastifyInstance } from 'fastify'
import { clientController } from '../controllers/clientController.js'

export async function clientRoutes(app: FastifyInstance) {
  app.get(
    '/clients',
    {
      schema: {
        tags: ['Clients'],
        summary: 'List all clients',
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
                    phone: { type: 'string' },
                    pushSubscription: { type: 'object', nullable: true },
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
    clientController.list.bind(clientController)
  )

  app.get(
    '/clients/:id',
    {
      schema: {
        tags: ['Clients'],
        summary: 'Get client by ID',
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
              phone: { type: 'string' },
              pushSubscription: { type: 'object', nullable: true },
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
    clientController.getById.bind(clientController)
  )

  app.post(
    '/clients',
    {
      schema: {
        tags: ['Clients'],
        summary: 'Create new client',
        body: {
          type: 'object',
          required: ['name', 'phone'],
          properties: {
            name: { type: 'string', minLength: 1 },
            phone: { type: 'string', minLength: 10 },
            pushSubscription: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              phone: { type: 'string' },
              pushSubscription: { type: 'object', nullable: true },
              isActive: { type: 'boolean' },
              barbershopId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          409: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    clientController.create.bind(clientController)
  )

  app.put(
    '/clients/:id',
    {
      schema: {
        tags: ['Clients'],
        summary: 'Update client',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            phone: { type: 'string', minLength: 10 },
            pushSubscription: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              phone: { type: 'string' },
              pushSubscription: { type: 'object', nullable: true },
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
    clientController.update.bind(clientController)
  )

  app.delete(
    '/clients/:id',
    {
      schema: {
        tags: ['Clients'],
        summary: 'Delete client',
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
    clientController.delete.bind(clientController)
  )
}
