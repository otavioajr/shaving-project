import { prisma } from '../lib/prisma.js'
import type { Prisma, Transaction, TransactionType } from '@prisma/client'

const professionalPublicSelect = {
  id: true,
  barbershopId: true,
  name: true,
  email: true,
  commissionRate: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export interface PaginationParams {
  page: number
  limit: number
}

export interface TransactionListResult {
  data: Transaction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ListFilters {
  type?: TransactionType
  category?: string
  startDate?: string
  endDate?: string
}

export class TransactionRepository {
  async findById(id: string, barbershopId: string): Promise<Transaction | null> {
    return prisma.transaction.findFirst({
      where: { id, barbershopId },
      include: { createdBy: { select: professionalPublicSelect } },
    })
  }

  async list(
    barbershopId: string,
    params: PaginationParams,
    filters?: ListFilters
  ): Promise<TransactionListResult> {
    const { page, limit } = params
    const skip = (page - 1) * limit

    const where: Prisma.TransactionWhereInput = {
      barbershopId,
      ...(filters?.type && { type: filters.type }),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.startDate && filters?.endDate && {
        date: {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        },
      }),
    }

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: { createdBy: { select: professionalPublicSelect } },
      }),
      prisma.transaction.count({ where }),
    ])

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async create(data: Prisma.TransactionCreateInput): Promise<Transaction> {
    return prisma.transaction.create({
      data,
      include: { createdBy: { select: professionalPublicSelect } },
    })
  }

  async update(id: string, barbershopId: string, data: Prisma.TransactionUpdateInput): Promise<Transaction> {
    const existing = await prisma.transaction.findFirst({ where: { id, barbershopId } })
    if (!existing) {
      throw new Error('Transaction not found')
    }
    return prisma.transaction.update({
      where: { id },
      data,
      include: { createdBy: { select: professionalPublicSelect } },
    })
  }

  async delete(id: string, barbershopId: string): Promise<Transaction> {
    const existing = await prisma.transaction.findFirst({ where: { id, barbershopId } })
    if (!existing) {
      throw new Error('Transaction not found')
    }
    return prisma.transaction.delete({
      where: { id },
      include: { createdBy: { select: professionalPublicSelect } },
    })
  }
}

export const transactionRepository = new TransactionRepository()
