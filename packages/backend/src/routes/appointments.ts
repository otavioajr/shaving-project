import type { FastifyInstance } from 'fastify'
import { appointmentController } from '../controllers/appointmentController.js'

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    details: { type: 'array' },
  },
  additionalProperties: true,
} as const

const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'number' },
    limit: { type: 'number' },
    total: { type: 'number' },
    totalPages: { type: 'number' },
  },
  additionalProperties: true,
} as const

const appointmentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    barbershopId: { type: 'string' },
    professionalId: { type: 'string' },
    clientId: { type: 'string' },
    serviceId: { type: 'string' },
    createdById: { type: 'string' },
    date: { type: 'string', format: 'date-time' },
    status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] },
    price: { type: 'number' },
    commissionValue: { type: 'number', nullable: true },
    notes: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  additionalProperties: true,
} as const

const appointmentListSchema = {
  type: 'object',
  properties: {
    data: { type: 'array', items: appointmentSchema },
    pagination: paginationSchema,
  },
  additionalProperties: true,
} as const

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
            ...appointmentListSchema,
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
        response: { 200: appointmentSchema, 404: errorResponseSchema },
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
        response: {
          201: appointmentSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
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
        response: {
          200: appointmentSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
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
        response: { 200: appointmentSchema, 400: errorResponseSchema, 401: errorResponseSchema, 404: errorResponseSchema },
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
        response: { 204: { type: 'null' }, 400: errorResponseSchema, 401: errorResponseSchema, 404: errorResponseSchema },
      },
    },
    appointmentController.delete.bind(appointmentController)
  )
}
