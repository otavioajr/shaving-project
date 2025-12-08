import { appointmentRepository, type PaginationParams, type ListFilters } from '../repositories/appointmentRepository.js'
import { serviceRepository } from '../repositories/serviceRepository.js'
import { professionalRepository } from '../repositories/professionalRepository.js'
import { clientRepository } from '../repositories/clientRepository.js'
import type { Appointment, AppointmentStatus } from '@prisma/client'

export interface CreateAppointmentInput {
  professionalId: string
  clientId: string
  serviceId: string
  date: string
  notes?: string
  barbershopId: string
  createdById: string
}

export interface UpdateAppointmentInput {
  professionalId?: string
  clientId?: string
  serviceId?: string
  date?: string
  notes?: string
}

export interface UpdateStatusInput {
  status: AppointmentStatus
}

export class AppointmentService {
  async getAppointment(id: string, barbershopId: string): Promise<Appointment | null> {
    return appointmentRepository.findById(id, barbershopId)
  }

  async listAppointments(barbershopId: string, params: PaginationParams, filters?: ListFilters) {
    return appointmentRepository.list(barbershopId, params, filters)
  }

  async createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
    // Verify all referenced entities exist
    const [professional, client, service] = await Promise.all([
      professionalRepository.findById(input.professionalId, input.barbershopId),
      clientRepository.findById(input.clientId, input.barbershopId),
      serviceRepository.findById(input.serviceId, input.barbershopId),
    ])

    if (!professional) throw new Error('Professional not found')
    if (!client) throw new Error('Client not found')
    if (!service) throw new Error('Service not found')

    // Check for scheduling conflicts
    const conflict = await appointmentRepository.checkConflict(
      input.barbershopId,
      input.professionalId,
      new Date(input.date),
      service.duration
    )

    if (conflict) {
      throw new Error('Professional has a conflicting appointment at this time')
    }

    // Create appointment with price snapshot
    return appointmentRepository.create({
      date: new Date(input.date),
      notes: input.notes || null,
      price: Number(service.price),
      status: 'PENDING',
      barbershop: { connect: { id: input.barbershopId } },
      professional: { connect: { barbershopId_id: { barbershopId: input.barbershopId, id: input.professionalId } } },
      client: { connect: { barbershopId_id: { barbershopId: input.barbershopId, id: input.clientId } } },
      service: { connect: { barbershopId_id: { barbershopId: input.barbershopId, id: input.serviceId } } },
      createdBy: { connect: { barbershopId_id: { barbershopId: input.barbershopId, id: input.createdById } } },
    })
  }

  async updateAppointment(id: string, barbershopId: string, input: UpdateAppointmentInput): Promise<Appointment> {
    const appointment = await appointmentRepository.findById(id, barbershopId)
    if (!appointment) throw new Error('Appointment not found')

    // If changing date or professional, check for conflicts
    if (input.date || input.professionalId) {
      const professionalId = input.professionalId || appointment.professionalId
      const newDate = input.date ? new Date(input.date) : appointment.date

      // Get service duration
      const serviceId = input.serviceId || appointment.serviceId
      const service = await serviceRepository.findById(serviceId, barbershopId)
      if (!service) throw new Error('Service not found')

      const conflict = await appointmentRepository.checkConflict(
        barbershopId,
        professionalId,
        newDate,
        service.duration,
        id
      )

      if (conflict) {
        throw new Error('Professional has a conflicting appointment at this time')
      }
    }

    const updateData: any = {}
    if (input.date) updateData.date = new Date(input.date)
    if (input.professionalId) {
      const professional = await professionalRepository.findById(input.professionalId, barbershopId)
      if (!professional) throw new Error('Professional not found')
      updateData.professional = { connect: { barbershopId_id: { barbershopId, id: input.professionalId } } }
    }
    if (input.clientId) {
      const client = await clientRepository.findById(input.clientId, barbershopId)
      if (!client) throw new Error('Client not found')
      updateData.client = { connect: { barbershopId_id: { barbershopId, id: input.clientId } } }
    }
    if (input.serviceId) {
      const service = await serviceRepository.findById(input.serviceId, barbershopId)
      if (!service) throw new Error('Service not found')
      updateData.service = { connect: { barbershopId_id: { barbershopId, id: input.serviceId } } }
      // Update price snapshot
      updateData.price = Number(service.price)
    }
    if (input.notes) updateData.notes = input.notes

    return appointmentRepository.update(id, barbershopId, updateData)
  }

  async updateStatus(id: string, barbershopId: string, input: UpdateStatusInput): Promise<Appointment> {
    const appointment = await appointmentRepository.findById(id, barbershopId)
    if (!appointment) throw new Error('Appointment not found')

    const updateData: any = { status: input.status }

    // Calculate commission when appointment is completed
    if (input.status === 'COMPLETED' && !appointment.commissionValue) {
      const professional = await professionalRepository.findById(appointment.professionalId, barbershopId)
      if (professional) {
        const commissionValue = Number(appointment.price) * (Number(professional.commissionRate) / 100)
        updateData.commissionValue = commissionValue
      }
    }

    return appointmentRepository.update(id, barbershopId, updateData)
  }

  async deleteAppointment(id: string, barbershopId: string): Promise<void> {
    const appointment = await appointmentRepository.findById(id, barbershopId)
    if (!appointment) throw new Error('Appointment not found')

    await appointmentRepository.delete(id, barbershopId)
  }
}

export const appointmentService = new AppointmentService()
