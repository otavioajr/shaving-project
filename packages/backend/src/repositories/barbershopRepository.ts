import { prisma } from '../lib/prisma.js'
import type { Prisma, Barbershop } from '@prisma/client'

export class BarbershopRepository {
  async findById(id: string): Promise<Barbershop | null> {
    return prisma.barbershop.findUnique({
      where: { id },
    })
  }

  async findBySlug(slug: string): Promise<Barbershop | null> {
    return prisma.barbershop.findUnique({
      where: { slug },
    })
  }

  async update(id: string, data: Prisma.BarbershopUpdateInput): Promise<Barbershop> {
    return prisma.barbershop.update({
      where: { id },
      data,
    })
  }
}

export const barbershopRepository = new BarbershopRepository()
