import { prisma } from '../lib/prisma.js'
import type { Prisma, Client } from '@prisma/client'

export interface PaginationParams {
  page: number
  limit: number
}

export interface ClientListResult {
  data: Client[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export class ClientRepository {
  async findById(id: string, barbershopId: string): Promise<Client | null> {
    return prisma.client.findFirst({
      where: {
        id,
        barbershopId,
      },
    })
  }

  async findByPhone(phone: string, barbershopId: string): Promise<Client | null> {
    return prisma.client.findFirst({
      where: {
        phone,
        barbershopId,
      },
    })
  }

  async list(barbershopId: string, params: PaginationParams): Promise<ClientListResult> {
    const { page, limit } = params
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      prisma.client.findMany({
        where: { barbershopId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.client.count({
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

  async create(data: Prisma.ClientCreateInput): Promise<Client> {
    return prisma.client.create({ data })
  }

  async update(id: string, barbershopId: string, data: Prisma.ClientUpdateInput): Promise<Client> {
    const existing = await prisma.client.findFirst({ where: { id, barbershopId } })
    if (!existing) {
      throw new Error('Client not found')
    }
    return prisma.client.update({
      where: { id },
      data,
    })
  }

  async delete(id: string, barbershopId: string): Promise<Client> {
    const existing = await prisma.client.findFirst({ where: { id, barbershopId } })
    if (!existing) {
      throw new Error('Client not found')
    }
    return prisma.client.delete({
      where: { id },
    })
  }
}

export const clientRepository = new ClientRepository()
