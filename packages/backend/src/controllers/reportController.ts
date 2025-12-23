import type { FastifyRequest, FastifyReply } from 'fastify'
import { reportService } from '../services/reportService.js'
import { z } from 'zod'

const dateRangeSchema = z
  .object({
    dateFrom: z.string().datetime(),
    dateTo: z.string().datetime(),
  })
  .refine(
    (data) => {
      const from = new Date(data.dateFrom)
      const to = new Date(data.dateTo)
      return from <= to
    },
    { message: 'dateFrom must be less than or equal to dateTo', path: ['dateFrom'] }
  )
  .refine(
    (data) => {
      const from = new Date(data.dateFrom)
      const to = new Date(data.dateTo)
      const diffTime = Math.abs(to.getTime() - from.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays <= 365
    },
    { message: 'Period cannot exceed 365 days', path: ['dateFrom'] }
  )

const commissionQuerySchema = dateRangeSchema.and(
  z.object({
    professionalId: z.string().uuid().optional(),
  })
)

export class ReportController {
  async getFinancialSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { dateFrom, dateTo } = dateRangeSchema.parse(request.query)
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

      const result = await reportService.getFinancialSummary(
        barbershopId,
        new Date(dateFrom),
        new Date(dateTo)
      )

      return reply.status(200).send(result)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      throw error
    }
  }

  async getCommissionReport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { dateFrom, dateTo, professionalId } = commissionQuerySchema.parse(request.query)
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

      const result = await reportService.getCommissionReport(
        barbershopId,
        new Date(dateFrom),
        new Date(dateTo),
        professionalId
      )

      return reply.status(200).send(result)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: error.errors })
      }
      throw error
    }
  }
}

export const reportController = new ReportController()
