import { prisma } from '../lib/prisma.js'
import type { Prisma, Appointment, AppointmentStatus } from '@prisma/client'
import { addMinutes, subMinutes } from 'date-fns'

export interface PaginationParams {
  page: number
  limit: number
}

export interface AppointmentListResult {
  data: Appointment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ListFilters {
  status?: AppointmentStatus
  professionalId?: string
  clientId?: string
  startDate?: string
  endDate?: string
}

export class AppointmentRepository {
  async findById(id: string, barbershopId: string): Promise<Appointment | null> {
    return prisma.appointment.findFirst({
      where: { id, barbershopId },
      include: { professional: true, client: true, service: true, createdBy: true },
    })
  }

  async list(
    barbershopId: string,
    params: PaginationParams,
    filters?: ListFilters
  ): Promise<AppointmentListResult> {
    const { page, limit } = params
    const skip = (page - 1) * limit

    const where: Prisma.AppointmentWhereInput = {
      barbershopId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.professionalId && { professionalId: filters.professionalId }),
      ...(filters?.clientId && { clientId: filters.clientId }),
      ...(filters?.startDate && filters?.endDate && {
        date: {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        },
      }),
    }

    const [data, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'asc' },
        include: { professional: true, client: true, service: true, createdBy: true },
      }),
      prisma.appointment.count({ where }),
    ])

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async checkConflict(
    barbershopId: string,
    professionalId: string,
    date: Date,
    duration: number,
    excludeId?: string
  ): Promise<boolean> {
    const appointmentStart = new Date(date)
    const appointmentEnd = addMinutes(appointmentStart, duration)

    const conflicts = await prisma.appointment.findMany({
      where: {
        barbershopId,
        professionalId,
        status: { notIn: ['CANCELLED'] },
        id: excludeId ? { not: excludeId } : undefined,
        date: {
          gte: subMinutes(appointmentStart, 480), // 8 hour lookback
          lte: addMinutes(appointmentEnd, 480), // 8 hour lookahead
        },
      },
      include: { service: true },
    })

    return conflicts.some((apt) => {
      const existingEnd = addMinutes(apt.date, apt.service.duration)
      return appointmentStart < existingEnd && appointmentEnd > apt.date
    })
  }

  async create(data: Prisma.AppointmentCreateInput): Promise<Appointment> {
    return prisma.appointment.create({
      data,
      include: { professional: true, client: true, service: true, createdBy: true },
    })
  }

  async update(id: string, barbershopId: string, data: Prisma.AppointmentUpdateInput): Promise<Appointment> {
    const existing = await prisma.appointment.findFirst({ where: { id, barbershopId } })
    if (!existing) {
      throw new Error('Appointment not found')
    }
    return prisma.appointment.update({
      where: { id },
      data,
      include: { professional: true, client: true, service: true, createdBy: true },
    })
  }

  async delete(id: string, barbershopId: string): Promise<Appointment> {
    const existing = await prisma.appointment.findFirst({ where: { id, barbershopId } })
    if (!existing) {
      throw new Error('Appointment not found')
    }
    return prisma.appointment.delete({
      where: { id },
      include: { professional: true, client: true, service: true, createdBy: true },
    })
  }
}

export const appointmentRepository = new AppointmentRepository()
