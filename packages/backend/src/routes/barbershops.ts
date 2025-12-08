import type { FastifyInstance } from 'fastify'
import { barbershopController } from '../controllers/barbershopController.js'

export async function barbershopRoutes(app: FastifyInstance) {
  app.get(
    '/barbershop',
    {
      schema: {
        tags: ['Barbershops'],
        summary: 'Get current barbershop data',
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
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    barbershopController.get.bind(barbershopController)
  )

  app.put(
    '/barbershop',
    {
      schema: {
        tags: ['Barbershops'],
        summary: 'Update barbershop data',
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
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    barbershopController.update.bind(barbershopController)
  )
}
