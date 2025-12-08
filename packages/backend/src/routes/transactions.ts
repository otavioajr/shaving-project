import type { FastifyInstance } from 'fastify'
import { transactionController } from '../controllers/transactionController.js'

export async function transactionRoutes(app: FastifyInstance) {
  app.get(
    '/transactions',
    {
      schema: {
        tags: ['Transactions'],
        summary: 'List all transactions',
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
            category: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        response: { 200: { type: 'object' } },
      },
    },
    transactionController.list.bind(transactionController)
  )

  app.get(
    '/transactions/:id',
    {
      schema: {
        tags: ['Transactions'],
        summary: 'Get transaction by ID',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { type: 'object' }, 404: { type: 'object' } },
      },
    },
    transactionController.getById.bind(transactionController)
  )

  app.post(
    '/transactions',
    {
      schema: {
        tags: ['Transactions'],
        summary: 'Create new transaction',
        body: {
          type: 'object',
          required: ['amount', 'type', 'category', 'date'],
          properties: {
            amount: { type: 'number', minimum: 0 },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
            category: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            paymentMethod: { type: 'string', enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX'] },
          },
        },
        response: { 201: { type: 'object' } },
      },
    },
    transactionController.create.bind(transactionController)
  )

  app.put(
    '/transactions/:id',
    {
      schema: {
        tags: ['Transactions'],
        summary: 'Update transaction',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          properties: {
            amount: { type: 'number', minimum: 0 },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
            category: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            paymentMethod: { type: 'string', enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX'] },
          },
        },
        response: { 200: { type: 'object' }, 404: { type: 'object' } },
      },
    },
    transactionController.update.bind(transactionController)
  )

  app.delete(
    '/transactions/:id',
    {
      schema: {
        tags: ['Transactions'],
        summary: 'Delete transaction',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 204: { type: 'null' }, 404: { type: 'object' } },
      },
    },
    transactionController.delete.bind(transactionController)
  )
}
