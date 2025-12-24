import { barbershopRepository } from '../repositories/barbershopRepository.js'
import { prisma } from '../lib/prisma.js'
import type { Barbershop, Prisma, Professional, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

export interface UpdateBarbershopInput {
  name?: string
  isActive?: boolean
}

export interface SelfRegisterInput {
  name: string
  slug: string
  adminEmail: string
  adminPassword: string
  adminName: string
}

export interface SelfRegisterResult {
  barbershop: Barbershop
  admin: Pick<Professional, 'id' | 'name' | 'email'>
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

    const updateData: Prisma.BarbershopUpdateInput = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.isActive !== undefined) updateData.isActive = input.isActive

    return barbershopRepository.update(id, updateData)
  }

  validateSlug(slug: string): { valid: boolean; error?: string } {
    if (slug.length < 3) {
      return { valid: false, error: 'Slug must be at least 3 characters' }
    }
    if (slug.length > 50) {
      return { valid: false, error: 'Slug must be at most 50 characters' }
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return {
        valid: false,
        error:
          'Slug must contain only lowercase letters, numbers, and hyphens (no leading or trailing hyphens)',
      }
    }
    return { valid: true }
  }

  async getPublicInfo(
    slug: string
  ): Promise<{ id: string; name: string; slug: string; isActive: boolean } | null> {
    const barbershop = await barbershopRepository.findBySlug(slug)
    if (!barbershop || !barbershop.isActive) {
      return null
    }
    return {
      id: barbershop.id,
      name: barbershop.name,
      slug: barbershop.slug,
      isActive: barbershop.isActive,
    }
  }

  async selfRegister(input: SelfRegisterInput): Promise<SelfRegisterResult> {
    // Validate slug format
    const slugValidation = this.validateSlug(input.slug)
    if (!slugValidation.valid) {
      throw new Error(slugValidation.error)
    }

    // Check slug uniqueness
    const isSlugUnique = await barbershopRepository.isSlugUnique(input.slug)
    if (!isSlugUnique) {
      throw new Error('Slug already in use')
    }

    // Check email uniqueness globally
    const existingEmail = await barbershopRepository.findEmailGlobally(input.adminEmail)
    if (existingEmail) {
      throw new Error('Email already registered')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.adminPassword, 10)

    const createdBarbershop = await prisma.barbershop.create({
      data: {
        name: input.name,
        slug: input.slug,
        isActive: true,
        professionals: {
          create: {
            name: input.adminName,
            email: input.adminEmail,
            passwordHash,
            role: 'ADMIN' as Role,
            commissionRate: 0,
          },
        },
      },
      include: {
        professionals: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    const { professionals, ...barbershop } = createdBarbershop
    const admin = professionals[0]

    return {
      barbershop,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
    }
  }
}

export const barbershopService = new BarbershopService()
