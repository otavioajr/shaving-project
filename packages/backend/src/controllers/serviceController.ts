import type { FastifyRequest, FastifyReply } from 'fastify'
import { serviceService } from '../services/serviceService.js'
import { z } from 'zod'

const createServiceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.number().positive('Price must be positive'),
  duration: z.number().int().positive('Duration must be a positive integer (minutes)'),
})

const updateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  duration: z.number().int().positive().optional(),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const idParamSchema = z.object({
  id: z.string().min(1),
})

export class ServiceController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { page, limit } = listQuerySchema.parse(request.query)
      const barbershopId = (request as any).tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      const result = await serviceService.listServices(barbershopId, { page, limit })
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
      const barbershopId = (request as any).tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      const service = await serviceService.getService(id, barbershopId)

      if (!service) {
        return reply.status(404).send({ error: 'Service not found' })
      }

      return reply.status(200).send(service)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      throw error
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createServiceSchema.parse(request.body)
      const barbershopId = (request as any).tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      const service = await serviceService.createService({
        ...data,
        barbershopId,
      })

      return reply.status(201).send(service)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      throw error
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = idParamSchema.parse(request.params)
      const data = updateServiceSchema.parse(request.body)
      const barbershopId = (request as any).tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      const service = await serviceService.updateService(id, barbershopId, data)
      return reply.status(200).send(service)
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
      const barbershopId = (request as any).tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      await serviceService.deleteService(id, barbershopId)
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

export const serviceController = new ServiceController()
