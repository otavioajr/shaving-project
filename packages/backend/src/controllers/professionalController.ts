import type { FastifyRequest, FastifyReply } from 'fastify'
import { professionalService } from '../services/professionalService.js'
import { z } from 'zod'

// Validation schemas
const createProfessionalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  commissionRate: z.number().min(0).max(100, 'Commission rate must be between 0 and 100'),
  role: z.enum(['ADMIN', 'BARBER']),
})

const updateProfessionalSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  role: z.enum(['ADMIN', 'BARBER']).optional(),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
})

export class ProfessionalController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { page, limit } = listQuerySchema.parse(request.query)
      const barbershopId = (request as any).tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      const result = await professionalService.listProfessionals(barbershopId, { page, limit })

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

      const professional = await professionalService.getProfessional(id, barbershopId)

      if (!professional) {
        return reply.status(404).send({ error: 'Professional not found' })
      }

      // Remove password hash from response
      const { passwordHash, ...professionalData } = professional

      return reply.status(200).send(professionalData)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      throw error
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createProfessionalSchema.parse(request.body)
      const barbershopId = (request as any).tenantId
      const user = (request as any).user

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      // Require authentication for creating professionals
      if (!user?.id) {
        return reply.status(401).send({ error: 'Authentication required' })
      }

      const professional = await professionalService.createProfessional({
        ...data,
        barbershopId,
      })

      // Remove password hash from response
      const { passwordHash, ...professionalData } = professional

      return reply.status(201).send(professionalData)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      if (error instanceof Error && error.message.includes('Email already registered')) {
        return reply.status(409).send({ error: error.message })
      }
      throw error
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = idParamSchema.parse(request.params)
      const data = updateProfessionalSchema.parse(request.body)
      const barbershopId = (request as any).tenantId
      const user = (request as any).user

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      // Require authentication for updating professionals
      if (!user?.id) {
        return reply.status(401).send({ error: 'Authentication required' })
      }

      const professional = await professionalService.updateProfessional(id, barbershopId, data)

      // Remove password hash from response
      const { passwordHash, ...professionalData } = professional

      return reply.status(200).send(professionalData)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message })
      }
      if (error instanceof Error && error.message.includes('Email already in use')) {
        return reply.status(409).send({ error: error.message })
      }
      throw error
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = idParamSchema.parse(request.params)
      const barbershopId = (request as any).tenantId
      const user = (request as any).user

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      // Require authentication for deleting professionals
      if (!user?.id) {
        return reply.status(401).send({ error: 'Authentication required' })
      }

      await professionalService.deleteProfessional(id, barbershopId)

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

export const professionalController = new ProfessionalController()
