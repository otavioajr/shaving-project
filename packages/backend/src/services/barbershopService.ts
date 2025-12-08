import { barbershopRepository } from '../repositories/barbershopRepository.js'
import type { Barbershop } from '@prisma/client'

export interface UpdateBarbershopInput {
  name?: string
  isActive?: boolean
}

export class BarbershopService {
  async getBarbershop(id: string): Promise<Barbershop | null> {
    return barbershopRepository.findById(id)
  }

  async updateBarbershop(id: string, input: UpdateBarbershopInput): Promise<Barbershop> {
    const barbershop = await barbershopRepository.findById(id)
    if (!barbershop) {
      throw new Error('Barbershop not found')
    }

    const updateData: any = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.isActive !== undefined) updateData.isActive = input.isActive

    return barbershopRepository.update(id, updateData)
  }
}

export const barbershopService = new BarbershopService()
