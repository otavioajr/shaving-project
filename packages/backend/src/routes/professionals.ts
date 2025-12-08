import type { FastifyInstance } from 'fastify'
import { professionalController } from '../controllers/professionalController.js'

export async function professionalRoutes(app: FastifyInstance) {
  // List all professionals with pagination
  app.get(
    '/professionals',
    {
      schema: {
        tags: ['Professionals'],
        summary: 'List all professionals',
        description: 'Get a paginated list of professionals for the current tenant',
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
                    email: { type: 'string', format: 'email' },
                    role: { type: 'string', enum: ['ADMIN', 'BARBER'] },
                    commissionRate: { type: 'number' },
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
    professionalController.list.bind(professionalController)
  )

  // Get professional by ID
  app.get(
    '/professionals/:id',
    {
      schema: {
        tags: ['Professionals'],
        summary: 'Get professional by ID',
        description: 'Retrieve a specific professional by their ID',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              role: { type: 'string', enum: ['ADMIN', 'BARBER'] },
              commissionRate: { type: 'number' },
              barbershopId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    professionalController.getById.bind(professionalController)
  )

  // Create new professional
  app.post(
    '/professionals',
    {
      schema: {
        tags: ['Professionals'],
        summary: 'Create new professional',
        description: 'Register a new professional for the current tenant',
        body: {
          type: 'object',
          required: ['name', 'email', 'password', 'commissionRate', 'role'],
          properties: {
            name: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            commissionRate: { type: 'number', minimum: 0, maximum: 100 },
            role: { type: 'string', enum: ['ADMIN', 'BARBER'] },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              role: { type: 'string', enum: ['ADMIN', 'BARBER'] },
              commissionRate: { type: 'number' },
              barbershopId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          409: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    professionalController.create.bind(professionalController)
  )

  // Update professional
  app.put(
    '/professionals/:id',
    {
      schema: {
        tags: ['Professionals'],
        summary: 'Update professional',
        description: 'Update an existing professional',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            commissionRate: { type: 'number', minimum: 0, maximum: 100 },
            role: { type: 'string', enum: ['ADMIN', 'BARBER'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              role: { type: 'string', enum: ['ADMIN', 'BARBER'] },
              commissionRate: { type: 'number' },
              barbershopId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    professionalController.update.bind(professionalController)
  )

  // Delete professional
  app.delete(
    '/professionals/:id',
    {
      schema: {
        tags: ['Professionals'],
        summary: 'Delete professional',
        description: 'Remove a professional from the system',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Professional deleted successfully',
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    professionalController.delete.bind(professionalController)
  )
}
