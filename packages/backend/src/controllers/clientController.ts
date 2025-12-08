import type { FastifyRequest, FastifyReply } from 'fastify'
import { clientService } from '../services/clientService.js'
import { z } from 'zod'

const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Phone must have at least 10 characters'),
  pushSubscription: z.any().optional(),
})

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  pushSubscription: z.any().optional(),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const idParamSchema = z.object({
  id: z.string().min(1),
})

export class ClientController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { page, limit } = listQuerySchema.parse(request.query)
      const barbershopId = (request as any).tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      const result = await clientService.listClients(barbershopId, { page, limit })
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

      const client = await clientService.getClient(id, barbershopId)

      if (!client) {
        return reply.status(404).send({ error: 'Client not found' })
      }

      return reply.status(200).send(client)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      throw error
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createClientSchema.parse(request.body)
      const barbershopId = (request as any).tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      const client = await clientService.createClient({
        ...data,
        barbershopId,
      })

      return reply.status(201).send(client)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      if (error instanceof Error && error.message.includes('Phone already registered')) {
        return reply.status(409).send({ error: error.message })
      }
      throw error
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = idParamSchema.parse(request.params)
      const data = updateClientSchema.parse(request.body)
      const barbershopId = (request as any).tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      const client = await clientService.updateClient(id, barbershopId, data)
      return reply.status(200).send(client)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message })
      }
      if (error instanceof Error && error.message.includes('Phone already in use')) {
        return reply.status(409).send({ error: error.message })
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

      await clientService.deleteClient(id, barbershopId)
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

export const clientController = new ClientController()
