import type { FastifyInstance } from 'fastify'
import { appointmentController } from '../controllers/appointmentController.js'

export async function appointmentRoutes(app: FastifyInstance) {
  app.get(
    '/appointments',
    {
      schema: {
        tags: ['Appointments'],
        summary: 'List all appointments',
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] },
            professionalId: { type: 'string' },
            clientId: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'array' },
              pagination: { type: 'object' },
            },
          },
        },
      },
    },
    appointmentController.list.bind(appointmentController)
  )

  app.get(
    '/appointments/:id',
    {
      schema: {
        tags: ['Appointments'],
        summary: 'Get appointment by ID',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { type: 'object' }, 404: { type: 'object' } },
      },
    },
    appointmentController.getById.bind(appointmentController)
  )

  app.post(
    '/appointments',
    {
      schema: {
        tags: ['Appointments'],
        summary: 'Create new appointment',
        body: {
          type: 'object',
          required: ['professionalId', 'clientId', 'serviceId', 'date'],
          properties: {
            professionalId: { type: 'string' },
            clientId: { type: 'string' },
            serviceId: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            notes: { type: 'string' },
          },
        },
        response: { 201: { type: 'object' }, 409: { type: 'object' } },
      },
    },
    appointmentController.create.bind(appointmentController)
  )

  app.put(
    '/appointments/:id',
    {
      schema: {
        tags: ['Appointments'],
        summary: 'Update appointment',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          properties: {
            professionalId: { type: 'string' },
            clientId: { type: 'string' },
            serviceId: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            notes: { type: 'string' },
          },
        },
        response: { 200: { type: 'object' }, 404: { type: 'object' }, 409: { type: 'object' } },
      },
    },
    appointmentController.update.bind(appointmentController)
  )

  app.patch(
    '/appointments/:id/status',
    {
      schema: {
        tags: ['Appointments'],
        summary: 'Update appointment status',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] },
          },
        },
        response: { 200: { type: 'object' }, 404: { type: 'object' } },
      },
    },
    appointmentController.updateStatus.bind(appointmentController)
  )

  app.delete(
    '/appointments/:id',
    {
      schema: {
        tags: ['Appointments'],
        summary: 'Delete appointment',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 204: { type: 'null' }, 404: { type: 'object' } },
      },
    },
    appointmentController.delete.bind(appointmentController)
  )
}
