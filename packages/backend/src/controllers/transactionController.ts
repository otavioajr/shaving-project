import type { FastifyRequest, FastifyReply } from 'fastify'
import { transactionService } from '../services/transactionService.js'
import { z } from 'zod'

const createTransactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().min(1),
  description: z.string().optional(),
  date: z.string().datetime(),
  paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX']).optional(),
})

const updateTransactionSchema = z.object({
  amount: z.number().positive().optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z.string().min(1).optional(),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
  paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX']).optional(),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const idParamSchema = z.object({
  id: z.string().min(1),
})

export class TransactionController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { page, limit, ...filters } = listQuerySchema.parse(request.query)
      const barbershopId = request.tenantId
      const user = request.user

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      if (!user?.id) {
        return reply.status(401).send({ error: 'Authentication required' })
      }

      if (user.barbershopId !== barbershopId) {
        return reply.status(403).send({ error: 'Tenant mismatch' })
      }

      const result = await transactionService.listTransactions(
        barbershopId,
        { page, limit },
        filters
      )
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
      const user = request.user

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      if (!user?.id) {
        return reply.status(401).send({ error: 'Authentication required' })
      }

      if (user.barbershopId !== barbershopId) {
        return reply.status(403).send({ error: 'Tenant mismatch' })
      }

      const transaction = await transactionService.getTransaction(id, barbershopId)

      if (!transaction) {
        return reply.status(404).send({ error: 'Transaction not found' })
      }

      return reply.status(200).send(transaction)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      throw error
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createTransactionSchema.parse(request.body)
      const barbershopId = request.tenantId
      const user = request.user

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      if (!user?.id) {
        return reply.status(401).send({ error: 'User not authenticated' })
      }

      if (user.barbershopId !== barbershopId) {
        return reply.status(403).send({ error: 'Tenant mismatch' })
      }

      const transaction = await transactionService.createTransaction({
        ...data,
        barbershopId,
        createdById: user.id,
      })

      return reply.status(201).send(transaction)
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

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = idParamSchema.parse(request.params)
      const data = updateTransactionSchema.parse(request.body)
      const barbershopId = request.tenantId
      const user = request.user

      if (!barbershopId) {
        return reply.status(401).send({ error: 'Tenant not identified' })
      }

      if (!user?.id) {
        return reply.status(401).send({ error: 'Authentication required' })
      }

      if (user.barbershopId !== barbershopId) {
        return reply.status(403).send({ error: 'Tenant mismatch' })
      }

      const transaction = await transactionService.updateTransaction(id, barbershopId, data)
      return reply.status(200).send(transaction)
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

      if (!user?.id) {
        return reply.status(401).send({ error: 'Authentication required' })
      }

      if (user.barbershopId !== barbershopId) {
        return reply.status(403).send({ error: 'Tenant mismatch' })
      }

      await transactionService.deleteTransaction(id, barbershopId)
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

export const transactionController = new TransactionController()
