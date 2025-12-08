import { serviceRepository, type PaginationParams } from '../repositories/serviceRepository.js'
import type { Service } from '@prisma/client'

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
  async getService(id: string, barbershopId: string): Promise<Service | null> {
    return serviceRepository.findById(id, barbershopId)
  }

  async listServices(barbershopId: string, params: PaginationParams) {
    return serviceRepository.list(barbershopId, params)
  }

  async createService(input: CreateServiceInput): Promise<Service> {
    return serviceRepository.create({
      name: input.name,
      price: input.price,
      duration: input.duration,
      barbershop: {
        connect: { id: input.barbershopId },
      },
    })
  }

  async updateService(id: string, barbershopId: string, input: UpdateServiceInput): Promise<Service> {
    const service = await serviceRepository.findById(id, barbershopId)
    if (!service) {
      throw new Error('Service not found')
    }

    const updateData: any = {
      ...(input.name && { name: input.name }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.duration !== undefined && { duration: input.duration }),
    }

    return serviceRepository.update(id, barbershopId, updateData)
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
