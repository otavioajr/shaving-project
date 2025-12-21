import bcrypt from 'bcryptjs'
import { professionalRepository, type PaginationParams } from '../repositories/professionalRepository.js'
import type { Role, Prisma } from '@prisma/client'
import { serializeProfessional } from '../lib/serializer.js'

export interface CreateProfessionalInput {
  name: string
  email: string
  password: string
  commissionRate: number
  role: Role
  barbershopId: string
}

export interface UpdateProfessionalInput {
  name?: string
  email?: string
  password?: string
  commissionRate?: number
  role?: Role
}

export class ProfessionalService {
  async getProfessional(id: string, barbershopId: string) {
    const professional = await professionalRepository.findById(id, barbershopId)
    return professional ? serializeProfessional(professional) : null
  }

  async listProfessionals(barbershopId: string, params: PaginationParams) {
    const result = await professionalRepository.list(barbershopId, params)
    return {
      data: result.data.map(serializeProfessional),
      pagination: result.pagination,
    }
  }

  async createProfessional(input: CreateProfessionalInput) {
    // Check if email already exists for this barbershop
    const existing = await professionalRepository.findByEmail(input.email, input.barbershopId)
    if (existing) {
      throw new Error('Email already registered for this barbershop')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 10)

    // Create professional
    const professional = await professionalRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      commissionRate: input.commissionRate,
      role: input.role,
      barbershop: {
        connect: { id: input.barbershopId },
      },
    })
    return serializeProfessional(professional)
  }

  async updateProfessional(id: string, barbershopId: string, input: UpdateProfessionalInput) {
    // Check if professional exists
    const professional = await professionalRepository.findById(id, barbershopId)
    if (!professional) {
      throw new Error('Professional not found')
    }

    // If updating email, check for conflicts
    if (input.email && input.email !== professional.email) {
      const existing = await professionalRepository.findByEmail(input.email, barbershopId)
      if (existing) {
        throw new Error('Email already in use')
      }
    }

    // Prepare update data
    const updateData: Prisma.ProfessionalUpdateInput = {
      ...(input.name && { name: input.name }),
      ...(input.email && { email: input.email }),
      ...(input.commissionRate !== undefined && { commissionRate: input.commissionRate }),
      ...(input.role && { role: input.role }),
    }

    // Hash password if provided
    if (input.password) {
      updateData.passwordHash = await bcrypt.hash(input.password, 10)
    }

    const updated = await professionalRepository.update(id, barbershopId, updateData)
    return serializeProfessional(updated)
  }

  async deleteProfessional(id: string, barbershopId: string): Promise<void> {
    const professional = await professionalRepository.findById(id, barbershopId)
    if (!professional) {
      throw new Error('Professional not found')
    }

    await professionalRepository.delete(id, barbershopId)
  }
}

export const professionalService = new ProfessionalService()
