import bcrypt from 'bcryptjs'
import { professionalRepository, type PaginationParams } from '../repositories/professionalRepository.js'
import type { Professional, Role } from '@prisma/client'

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
  async getProfessional(id: string, barbershopId: string): Promise<Professional | null> {
    return professionalRepository.findById(id, barbershopId)
  }

  async listProfessionals(barbershopId: string, params: PaginationParams) {
    return professionalRepository.list(barbershopId, params)
  }

  async createProfessional(input: CreateProfessionalInput): Promise<Professional> {
    // Check if email already exists for this barbershop
    const existing = await professionalRepository.findByEmail(input.email, input.barbershopId)
    if (existing) {
      throw new Error('Email already registered for this barbershop')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 10)

    // Create professional
    return professionalRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      commissionRate: input.commissionRate,
      role: input.role,
      barbershop: {
        connect: { id: input.barbershopId },
      },
    })
  }

  async updateProfessional(id: string, barbershopId: string, input: UpdateProfessionalInput): Promise<Professional> {
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
    const updateData: any = {
      ...(input.name && { name: input.name }),
      ...(input.email && { email: input.email }),
      ...(input.commissionRate !== undefined && { commissionRate: input.commissionRate }),
      ...(input.role && { role: input.role }),
    }

    // Hash password if provided
    if (input.password) {
      updateData.passwordHash = await bcrypt.hash(input.password, 10)
    }

    return professionalRepository.update(id, barbershopId, updateData)
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
