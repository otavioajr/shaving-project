import { prisma } from '../lib/prisma.js'
import type { Prisma, Professional } from '@prisma/client'

export interface PaginationParams {
  page: number
  limit: number
}

export interface ProfessionalListResult {
  data: Professional[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export class ProfessionalRepository {
  async findById(id: string, barbershopId: string): Promise<Professional | null> {
    return prisma.professional.findFirst({
      where: {
        id,
        barbershopId,
        isActive: true,
      },
    })
  }

  async findByEmail(email: string, barbershopId: string): Promise<Professional | null> {
    return prisma.professional.findFirst({
      where: {
        email,
        barbershopId,
      },
    })
  }

  async list(barbershopId: string, params: PaginationParams): Promise<ProfessionalListResult> {
    const { page, limit } = params
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      prisma.professional.findMany({
        where: { barbershopId, isActive: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.professional.count({
        where: { barbershopId, isActive: true },
      }),
    ])

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async create(data: Prisma.ProfessionalCreateInput): Promise<Professional> {
    return prisma.professional.create({ data })
  }

  async update(id: string, barbershopId: string, data: Prisma.ProfessionalUpdateInput): Promise<Professional> {
    const existing = await prisma.professional.findFirst({ where: { id, barbershopId, isActive: true } })
    if (!existing) {
      throw new Error('Professional not found')
    }
    return prisma.professional.update({
      where: { id },
      data,
    })
  }

  async delete(id: string, barbershopId: string): Promise<Professional> {
    const existing = await prisma.professional.findFirst({ where: { id, barbershopId, isActive: true } })
    if (!existing) {
      throw new Error('Professional not found')
    }
    return prisma.professional.update({
      where: { id },
      data: { isActive: false },
    })
  }
}

export const professionalRepository = new ProfessionalRepository()
