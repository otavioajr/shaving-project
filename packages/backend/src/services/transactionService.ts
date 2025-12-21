import { transactionRepository, type PaginationParams, type ListFilters } from '../repositories/transactionRepository.js'
import { professionalRepository } from '../repositories/professionalRepository.js'
import type { TransactionType, PaymentMethod, Prisma } from '@prisma/client'
import { serializeTransactionWithRelations } from '../lib/serializer.js'

export interface CreateTransactionInput {
  amount: number
  type: TransactionType
  category: string
  description?: string
  date: string
  paymentMethod?: PaymentMethod
  barbershopId: string
  createdById: string
}

export interface UpdateTransactionInput {
  amount?: number
  type?: TransactionType
  category?: string
  description?: string
  date?: string
  paymentMethod?: PaymentMethod
}

export class TransactionService {
  async getTransaction(id: string, barbershopId: string) {
    const transaction = await transactionRepository.findById(id, barbershopId)
    return transaction ? serializeTransactionWithRelations(transaction) : null
  }

  async listTransactions(barbershopId: string, params: PaginationParams, filters?: ListFilters) {
    const result = await transactionRepository.list(barbershopId, params, filters)
    return {
      data: result.data.map(serializeTransactionWithRelations),
      pagination: result.pagination,
    }
  }

  async createTransaction(input: CreateTransactionInput) {
    // Verify professional exists
    const professional = await professionalRepository.findById(input.createdById, input.barbershopId)
    if (!professional) {
      throw new Error('Professional not found')
    }

    const transaction = await transactionRepository.create({
      amount: input.amount,
      type: input.type,
      category: input.category,
      description: input.description || null,
      date: new Date(input.date),
      paymentMethod: input.paymentMethod || null,
      barbershop: { connect: { id: input.barbershopId } },
      createdBy: { connect: { barbershopId_id: { barbershopId: input.barbershopId, id: input.createdById } } },
    })
    return serializeTransactionWithRelations(transaction)
  }

  async updateTransaction(id: string, barbershopId: string, input: UpdateTransactionInput) {
    const transaction = await transactionRepository.findById(id, barbershopId)
    if (!transaction) {
      throw new Error('Transaction not found')
    }

    const updateData: Prisma.TransactionUpdateInput = {}
    if (input.amount !== undefined) updateData.amount = input.amount
    if (input.type !== undefined) updateData.type = input.type
    if (input.category !== undefined) updateData.category = input.category
    if (input.description !== undefined) updateData.description = input.description
    if (input.date !== undefined) updateData.date = new Date(input.date)
    if (input.paymentMethod !== undefined) updateData.paymentMethod = input.paymentMethod

    const updated = await transactionRepository.update(id, barbershopId, updateData)
    return serializeTransactionWithRelations(updated)
  }

  async deleteTransaction(id: string, barbershopId: string): Promise<void> {
    const transaction = await transactionRepository.findById(id, barbershopId)
    if (!transaction) {
      throw new Error('Transaction not found')
    }

    await transactionRepository.delete(id, barbershopId)
  }
}

export const transactionService = new TransactionService()
