import { timingSafeEqual } from 'crypto'
import type { FastifyInstance } from 'fastify'
import { notificationService } from '../services/notificationService.js'

export async function cronRoutes(app: FastifyInstance) {
  app.post(
    '/cron/notify',
    {
      schema: {
        tags: ['Cron'],
        summary: 'Send appointment reminder notifications',
        description: 'Protected by CRON_SECRET header. Runs every minute via Vercel cron.',
        headers: {
          type: 'object',
          properties: {
            'x-cron-secret': { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              sent: { type: 'number' },
              errors: { type: 'number' },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // Validate CRON_SECRET
      const cronSecretHeader = request.headers['x-cron-secret']
      const expectedSecret = process.env.CRON_SECRET

      if (!expectedSecret) {
        return reply.status(500).send({ error: 'CRON_SECRET not configured' })
      }

      const cronSecret =
        typeof cronSecretHeader === 'string' ? cronSecretHeader : (cronSecretHeader?.[0] ?? '')
      const cronSecretBuffer = Buffer.from(cronSecret)
      const expectedSecretBuffer = Buffer.from(expectedSecret)
      const secretsMatch =
        cronSecretBuffer.length === expectedSecretBuffer.length &&
        timingSafeEqual(cronSecretBuffer, expectedSecretBuffer)

      if (!secretsMatch) {
        return reply.status(401).send({ error: 'Invalid cron secret' })
      }

      try {
        const result = await notificationService.processReminders()
        request.log.info({ result }, 'Processed appointment reminders')
        return reply.status(200).send(result)
      } catch (error) {
        request.log.error(error, 'Error processing appointment reminders')
        const isProduction = process.env.NODE_ENV === 'production'
        const message = isProduction
          ? 'An internal error occurred while processing reminders'
          : error instanceof Error
            ? error.message
            : 'Unknown error'
        return reply.status(500).send({ error: message })
      }
    }
  )
}
