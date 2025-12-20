import { clientRepository, type PaginationParams } from '../repositories/clientRepository.js'
import { Prisma, type Client } from '@prisma/client'

export interface CreateClientInput {
  name: string
  phone: string
  pushSubscription?: Prisma.InputJsonValue | null
  barbershopId: string
}

export interface UpdateClientInput {
  name?: string
  phone?: string
  pushSubscription?: Prisma.InputJsonValue | null
}

export class ClientService {
  async getClient(id: string, barbershopId: string): Promise<Client | null> {
    return clientRepository.findById(id, barbershopId)
  }

  async listClients(barbershopId: string, params: PaginationParams) {
    return clientRepository.list(barbershopId, params)
  }

  async createClient(input: CreateClientInput): Promise<Client> {
    // Check if phone already exists for this barbershop
    const existing = await clientRepository.findByPhone(input.phone, input.barbershopId)
    if (existing) {
      throw new Error('Phone already registered for this barbershop')
    }

    return clientRepository.create({
      name: input.name,
      phone: input.phone,
      pushSubscription: input.pushSubscription ?? undefined,
      barbershop: {
        connect: { id: input.barbershopId },
      },
    })
  }

  async updateClient(id: string, barbershopId: string, input: UpdateClientInput): Promise<Client> {
    // Check if client exists
    const client = await clientRepository.findById(id, barbershopId)
    if (!client) {
      throw new Error('Client not found')
    }

    // If updating phone, check for conflicts
    if (input.phone && input.phone !== client.phone) {
      const existing = await clientRepository.findByPhone(input.phone, barbershopId)
      if (existing) {
        throw new Error('Phone already in use')
      }
    }

    const updateData: Prisma.ClientUpdateInput = {
      ...(input.name && { name: input.name }),
      ...(input.phone && { phone: input.phone }),
    }
    if (input.pushSubscription !== undefined) {
      updateData.pushSubscription = input.pushSubscription === null ? Prisma.DbNull : input.pushSubscription
    }

    return clientRepository.update(id, barbershopId, updateData)
  }

  async deleteClient(id: string, barbershopId: string): Promise<void> {
    const client = await clientRepository.findById(id, barbershopId)
    if (!client) {
      throw new Error('Client not found')
    }

    await clientRepository.delete(id, barbershopId)
  }
}

export const clientService = new ClientService()
