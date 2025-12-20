import type { FastifyInstance } from 'fastify'
import { transactionController } from '../controllers/transactionController.js'

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    details: { type: 'array' },
  },
  additionalProperties: true,
} as const

const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'number' },
    limit: { type: 'number' },
    total: { type: 'number' },
    totalPages: { type: 'number' },
  },
  additionalProperties: true,
} as const

const transactionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    barbershopId: { type: 'string' },
    createdById: { type: 'string' },
    amount: { type: 'number' },
    type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
    category: { type: 'string' },
    description: { type: 'string', nullable: true },
    date: { type: 'string', format: 'date-time' },
    paymentMethod: { type: 'string', enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX'], nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  additionalProperties: true,
} as const

const transactionListSchema = {
  type: 'object',
  properties: {
    data: { type: 'array', items: transactionSchema },
    pagination: paginationSchema,
  },
  additionalProperties: true,
} as const

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
        response: { 200: transactionListSchema },
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
        response: { 200: transactionSchema, 404: errorResponseSchema },
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
        response: { 201: transactionSchema, 400: errorResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema, 404: errorResponseSchema },
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
        response: { 200: transactionSchema, 400: errorResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema, 404: errorResponseSchema },
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
        response: { 204: { type: 'null' }, 400: errorResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema, 404: errorResponseSchema },
      },
    },
    transactionController.delete.bind(transactionController)
  )
}
