import type { FastifyRequest, FastifyReply } from 'fastify'
import { barbershopService } from '../services/barbershopService.js'
import { z } from 'zod'

const updateBarbershopSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
})

export class BarbershopController {
  async get(request: FastifyRequest, reply: FastifyReply) {
    const barbershopId = request.tenantId

    if (!barbershopId) {
      return reply.status(401).send({ error: 'Tenant not identified' })
    }

    const barbershop = await barbershopService.getBarbershop(barbershopId)

    if (!barbershop) {
      return reply.status(404).send({ error: 'Barbershop not found' })
    }

    return reply.status(200).send(barbershop)
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = updateBarbershopSchema.parse(request.body)
      const barbershopId = request.tenantId

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      const barbershop = await barbershopService.updateBarbershop(barbershopId, data)
      return reply.status(200).send(barbershop)
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

export const barbershopController = new BarbershopController()
