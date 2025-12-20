import { transactionRepository, type PaginationParams, type ListFilters } from '../repositories/transactionRepository.js'
import { professionalRepository } from '../repositories/professionalRepository.js'
import type { Transaction, TransactionType, PaymentMethod, Prisma } from '@prisma/client'

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
  async getTransaction(id: string, barbershopId: string): Promise<Transaction | null> {
    return transactionRepository.findById(id, barbershopId)
  }

  async listTransactions(barbershopId: string, params: PaginationParams, filters?: ListFilters) {
    return transactionRepository.list(barbershopId, params, filters)
  }

  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    // Verify professional exists
    const professional = await professionalRepository.findById(input.createdById, input.barbershopId)
    if (!professional) {
      throw new Error('Professional not found')
    }

    return transactionRepository.create({
      amount: input.amount,
      type: input.type,
      category: input.category,
      description: input.description || null,
      date: new Date(input.date),
      paymentMethod: input.paymentMethod || null,
      barbershop: { connect: { id: input.barbershopId } },
      createdBy: { connect: { barbershopId_id: { barbershopId: input.barbershopId, id: input.createdById } } },
    })
  }

  async updateTransaction(id: string, barbershopId: string, input: UpdateTransactionInput): Promise<Transaction> {
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

    return transactionRepository.update(id, barbershopId, updateData)
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
