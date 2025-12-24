import { prisma } from '../lib/prisma.js'
import type { Prisma, Barbershop, Professional } from '@prisma/client'

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

  async create(data: { name: string; slug: string; isActive?: boolean }): Promise<Barbershop> {
    return prisma.barbershop.create({
      data: {
        name: data.name,
        slug: data.slug,
        isActive: data.isActive ?? true,
      },
    })
  }

  async update(id: string, data: Prisma.BarbershopUpdateInput): Promise<Barbershop> {
    return prisma.barbershop.update({
      where: { id },
      data,
    })
  }

  async isSlugUnique(slug: string): Promise<boolean> {
    const existing = await prisma.barbershop.findUnique({
      where: { slug },
    })
    return !existing
  }

  async findEmailGlobally(email: string): Promise<Professional | null> {
    return prisma.professional.findFirst({
      where: { email },
    })
  }
}

export const barbershopRepository = new BarbershopRepository()
