import { prisma } from '../lib/prisma.js'
import type { Prisma, Service } from '@prisma/client'

export interface PaginationParams {
  page: number
  limit: number
}

export interface ServiceListResult {
  data: Service[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export class ServiceRepository {
  async findById(id: string, barbershopId: string): Promise<Service | null> {
    return prisma.service.findFirst({
      where: {
        id,
        barbershopId,
      },
    })
  }

  async list(barbershopId: string, params: PaginationParams): Promise<ServiceListResult> {
    const { page, limit } = params
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      prisma.service.findMany({
        where: { barbershopId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.service.count({
        where: { barbershopId },
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

  async create(data: Prisma.ServiceCreateInput): Promise<Service> {
    return prisma.service.create({ data })
  }

  async update(id: string, barbershopId: string, data: Prisma.ServiceUpdateInput): Promise<Service> {
    return prisma.service.update({
      where: {
        id,
        barbershopId,
      },
      data,
    })
  }

  async delete(id: string, barbershopId: string): Promise<Service> {
    return prisma.service.delete({
      where: {
        id,
        barbershopId,
      },
    })
  }
}

export const serviceRepository = new ServiceRepository()
