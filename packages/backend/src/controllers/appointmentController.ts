import type { FastifyRequest, FastifyReply } from 'fastify'
import { appointmentService } from '../services/appointmentService.js'
import { z } from 'zod'

const createAppointmentSchema = z.object({
  professionalId: z.string().min(1),
  clientId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().datetime(),
  notes: z.string().optional(),
})

const updateAppointmentSchema = z.object({
  professionalId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  serviceId: z.string().min(1).optional(),
  date: z.string().datetime().optional(),
  notes: z.string().optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  professionalId: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const idParamSchema = z.object({
  id: z.string().min(1),
})

export class AppointmentController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { page, limit, ...filters } = listQuerySchema.parse(request.query)
      const barbershopId = request.tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      const result = await appointmentService.listAppointments(barbershopId, { page, limit }, filters)
      return reply.status(200).send(result)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      throw error
    }
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = idParamSchema.parse(request.params)
      const barbershopId = request.tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      const appointment = await appointmentService.getAppointment(id, barbershopId)

      if (!appointment) {
        return reply.status(404).send({ error: 'Appointment not found' })
      }

      return reply.status(200).send(appointment)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      throw error
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createAppointmentSchema.parse(request.body)
      const barbershopId = request.tenantId
      const userId = request.user?.id // from JWT

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      if (!userId) {
        return reply.status(401).send({ error: 'User not authenticated' })
      }

      const appointment = await appointmentService.createAppointment({
        ...data,
        barbershopId,
        createdById: userId,
      })

      return reply.status(201).send(appointment)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message })
      }
      if (error instanceof Error && (error.message.includes('conflicting') || error.message.includes('conflict'))) {
        return reply.status(409).send({ error: error.message })
      }
      console.error('Unhandled appointment creation error:', error)
      throw error
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = idParamSchema.parse(request.params)
      const data = updateAppointmentSchema.parse(request.body)
      const barbershopId = request.tenantId
      const user = request.user

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      // Require authentication for updating appointments
      if (!user?.id) {
        return reply.status(401).send({ error: 'Authentication required' })
      }

      const appointment = await appointmentService.updateAppointment(id, barbershopId, data)
      return reply.status(200).send(appointment)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message })
      }
      if (error instanceof Error && error.message.includes('conflicting')) {
        return reply.status(409).send({ error: error.message })
      }
      throw error
    }
  }

  async updateStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = idParamSchema.parse(request.params)
      const data = updateStatusSchema.parse(request.body)
      const barbershopId = request.tenantId
      const user = request.user

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      // Require authentication for updating appointment status
      if (!user?.id) {
        return reply.status(401).send({ error: 'Authentication required' })
      }

      const appointment = await appointmentService.updateStatus(id, barbershopId, data)
      return reply.status(200).send(appointment)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message })
      }
      throw error
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = idParamSchema.parse(request.params)
      const barbershopId = request.tenantId
      const user = request.user

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      // Require authentication for deleting appointments
      if (!user?.id) {
        return reply.status(401).send({ error: 'Authentication required' })
      }

      await appointmentService.deleteAppointment(id, barbershopId)
      return reply.status(204).send()
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message })
      }
      throw error
    }
  }
}

export const appointmentController = new AppointmentController()
