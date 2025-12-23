import { FastifyInstance } from 'fastify'
import { reportController } from '../controllers/reportController.js'
import { authMiddleware } from '../middleware/auth.js'

export async function reportRoutes(app: FastifyInstance) {
  // Financial Summary Endpoint
  app.get(
    '/reports/summary',
    {
      preHandler: [authMiddleware],
      schema: {
        tags: ['Reports'],
        summary: 'Get financial summary',
        description: 'Returns aggregated financial data for a specified period',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['dateFrom', 'dateTo'],
          properties: {
            dateFrom: { type: 'string', format: 'date-time' },
            dateTo: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              period: {
                type: 'object',
                properties: {
                  from: { type: 'string' },
                  to: { type: 'string' },
                },
              },
              income: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  count: { type: 'number' },
                  byCategory: {
                    type: 'object',
                    additionalProperties: { type: 'number' },
                  },
                },
              },
              expenses: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  count: { type: 'number' },
                  byCategory: {
                    type: 'object',
                    additionalProperties: { type: 'number' },
                  },
                },
              },
              net: { type: 'number' },
              appointments: {
                type: 'object',
                properties: {
                  completed: { type: 'number' },
                  totalRevenue: { type: 'number' },
                  totalCommissions: { type: 'number' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              details: { type: 'array' },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    reportController.getFinancialSummary
  )

  // Commission Report Endpoint
  app.get(
    '/reports/commissions',
    {
      preHandler: [authMiddleware],
      schema: {
        tags: ['Reports'],
        summary: 'Get commission report',
        description: 'Returns commission breakdown by professional for a specified period',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['dateFrom', 'dateTo'],
          properties: {
            dateFrom: { type: 'string', format: 'date-time' },
            dateTo: { type: 'string', format: 'date-time' },
            professionalId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              period: {
                type: 'object',
                properties: {
                  from: { type: 'string' },
                  to: { type: 'string' },
                },
              },
              professionals: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    commissionRate: { type: 'number' },
                    appointmentsCompleted: { type: 'number' },
                    totalCommissions: { type: 'number' },
                    totalRevenue: { type: 'number' },
                  },
                },
              },
              totals: {
                type: 'object',
                properties: {
                  professionals: { type: 'number' },
                  appointmentsCompleted: { type: 'number' },
                  totalCommissions: { type: 'number' },
                  totalRevenue: { type: 'number' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              details: { type: 'array' },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    reportController.getCommissionReport
  )
}
