import { serviceRepository, type PaginationParams } from '../repositories/serviceRepository.js'
import type { Prisma } from '@prisma/client'
import { serializeService } from '../lib/serializer.js'

export interface CreateServiceInput {
  name: string
  price: number
  duration: number
  barbershopId: string
}

export interface UpdateServiceInput {
  name?: string
  price?: number
  duration?: number
}

export class ServiceService {
  async getService(id: string, barbershopId: string) {
    const service = await serviceRepository.findById(id, barbershopId)
    return service ? serializeService(service) : null
  }

  async listServices(barbershopId: string, params: PaginationParams) {
    const result = await serviceRepository.list(barbershopId, params)
    return {
      data: result.data.map(serializeService),
      pagination: result.pagination,
    }
  }

  async createService(input: CreateServiceInput) {
    const service = await serviceRepository.create({
      name: input.name,
      price: input.price,
      duration: input.duration,
      barbershop: {
        connect: { id: input.barbershopId },
      },
    })
    return serializeService(service)
  }

  async updateService(id: string, barbershopId: string, input: UpdateServiceInput) {
    const service = await serviceRepository.findById(id, barbershopId)
    if (!service) {
      throw new Error('Service not found')
    }

    const updateData: Prisma.ServiceUpdateInput = {
      ...(input.name && { name: input.name }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.duration !== undefined && { duration: input.duration }),
    }

    const updated = await serviceRepository.update(id, barbershopId, updateData)
    return serializeService(updated)
  }

  async deleteService(id: string, barbershopId: string): Promise<void> {
    const service = await serviceRepository.findById(id, barbershopId)
    if (!service) {
      throw new Error('Service not found')
    }

    await serviceRepository.delete(id, barbershopId)
  }
}

export const serviceService = new ServiceService()
