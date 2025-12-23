import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AppointmentWithRelations } from '../notificationService.js'

// Set env vars before any imports
process.env.VAPID_PUBLIC_KEY = 'test-public-key'
process.env.VAPID_PRIVATE_KEY = 'test-private-key'
process.env.VAPID_SUBJECT = 'mailto:test@example.com'

// Mock web-push
vi.mock('web-push', () => {
  const mockSendNotification = vi.fn()
  const mockSetVapidDetails = vi.fn()

  return {
    default: {
      sendNotification: mockSendNotification,
      setVapidDetails: mockSetVapidDetails,
      WebPushError: class WebPushError extends Error {
        statusCode: number
        constructor(message: string, statusCode: number) {
          super(message)
          this.statusCode = statusCode
        }
      },
    },
  }
})

// Mock prisma
vi.mock('../../lib/prisma.js', () => {
  const appointmentFindMany = vi.fn()
  const clientUpdate = vi.fn()

  return {
    prisma: {
      appointment: { findMany: appointmentFindMany },
      client: { update: clientUpdate },
    },
  }
})

import { NotificationService } from '../notificationService.js'
import webpush from 'web-push'

describe('NotificationService', () => {
  let service: NotificationService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new NotificationService()
  })

  describe('validateSubscription', () => {
    it('returns valid subscription for correct format', () => {
      const subscription = {
        endpoint: 'https://push.example.com/abc',
        keys: { p256dh: 'key1', auth: 'key2' },
      }
      expect(service.validateSubscription(subscription)).toEqual(subscription)
    })

    it('returns null for invalid endpoint URL', () => {
      const subscription = {
        endpoint: 'not-a-url',
        keys: { p256dh: 'key1', auth: 'key2' },
      }
      expect(service.validateSubscription(subscription)).toBeNull()
    })

    it('returns null for missing keys', () => {
      const subscription = {
        endpoint: 'https://push.example.com/abc',
        keys: { p256dh: 'key1' },
      }
      expect(service.validateSubscription(subscription)).toBeNull()
    })

    it('returns null for null input', () => {
      expect(service.validateSubscription(null)).toBeNull()
    })

    it('returns null for empty object', () => {
      expect(service.validateSubscription({})).toBeNull()
    })
  })

  describe('sendNotification', () => {
    const validSubscription = {
      endpoint: 'https://push.example.com/abc',
      keys: { p256dh: 'key1', auth: 'key2' },
    }

    it('sends notification successfully', async () => {
      const mockSendNotification = vi.mocked(webpush.sendNotification)
      mockSendNotification.mockResolvedValue({} as any)

      const result = await service.sendNotification(validSubscription, {
        title: 'Test',
        body: 'Test body',
      })
      expect(result.success).toBe(true)
      expect(mockSendNotification).toHaveBeenCalled()
    })

    it('handles 410 Gone error (expired subscription)', async () => {
      const mockSendNotification = vi.mocked(webpush.sendNotification)
      mockSendNotification.mockRejectedValue(new webpush.WebPushError('Gone', 410))

      const result = await service.sendNotification(validSubscription, {
        title: 'Test',
        body: 'Test body',
      })
      expect(result.success).toBe(false)
      expect(result.shouldRemoveSubscription).toBe(true)
    })

    it('handles 404 Not Found error (invalid subscription)', async () => {
      const mockSendNotification = vi.mocked(webpush.sendNotification)
      mockSendNotification.mockRejectedValue(new webpush.WebPushError('Not Found', 404))

      const result = await service.sendNotification(validSubscription, {
        title: 'Test',
        body: 'Test body',
      })
      expect(result.success).toBe(false)
      expect(result.shouldRemoveSubscription).toBe(true)
    })

    it('handles 429 rate limit error', async () => {
      const mockSendNotification = vi.mocked(webpush.sendNotification)
      mockSendNotification.mockRejectedValue(new webpush.WebPushError('Too Many', 429))

      const result = await service.sendNotification(validSubscription, {
        title: 'Test',
        body: 'Test body',
      })
      expect(result.success).toBe(false)
      expect(result.shouldRemoveSubscription).toBeUndefined()
      expect(result.error).toContain('Rate limit')
    })

    it('handles generic error', async () => {
      const mockSendNotification = vi.mocked(webpush.sendNotification)
      mockSendNotification.mockRejectedValue(new Error('Generic error'))

      const result = await service.sendNotification(validSubscription, {
        title: 'Test',
        body: 'Test body',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Generic error')
    })
  })

  describe('sendAppointmentReminder', () => {
    const validSubscription = {
      endpoint: 'https://push.example.com/abc',
      keys: { p256dh: 'key1', auth: 'key2' },
    }

    const mockClient = {
      id: 'client-1',
      barbershopId: 'shop-1',
      name: 'John Doe',
      phone: '11999999999',
      pushSubscription: validSubscription,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockAppointment = {
      id: 'apt-1',
      barbershopId: 'shop-1',
      professionalId: 'prof-1',
      clientId: 'client-1',
      serviceId: 'svc-1',
      createdById: 'prof-1',
      date: new Date(),
      price: 50n,
      commissionValue: null,
      status: 'CONFIRMED' as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      client: mockClient,
      professional: {
        id: 'prof-1',
        name: 'Jane Smith',
        barbershopId: 'shop-1',
        email: 'jane@test.com',
        passwordHash: 'hash',
        role: 'BARBER' as const,
        commissionRate: 30n,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      service: {
        id: 'svc-1',
        barbershopId: 'shop-1',
        name: 'Haircut',
        price: 50n,
        duration: 30,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    it('sends reminder successfully', async () => {
      const mockSendNotification = vi.mocked(webpush.sendNotification)
      mockSendNotification.mockResolvedValue({} as any)

      const result = await service.sendAppointmentReminder(
        mockClient,
        mockAppointment as AppointmentWithRelations
      )
      expect(result.success).toBe(true)
      expect(mockSendNotification).toHaveBeenCalled()
      const call = mockSendNotification.mock.calls[0]
      const payload = JSON.parse(call[1] as string)
      expect(payload.title).toBe('Lembrete de Agendamento')
      expect(payload.body).toContain('Jane Smith')
      expect(payload.body).toContain('Haircut')
    })

    it('returns error when no subscription', async () => {
      const clientNoSub = { ...mockClient, pushSubscription: null }
      const result = await service.sendAppointmentReminder(
        clientNoSub,
        mockAppointment as AppointmentWithRelations
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('No push subscription')
    })

    it('removes subscription when format is invalid', async () => {
      const clientBadSub = { ...mockClient, pushSubscription: { invalid: true } }
      const result = await service.sendAppointmentReminder(
        clientBadSub,
        mockAppointment as AppointmentWithRelations
      )
      expect(result.success).toBe(false)
      expect(result.shouldRemoveSubscription).toBe(true)
    })
  })

  describe('processReminders', () => {
    it('returns correct statistics', async () => {
      const { prisma } = await import('../../lib/prisma.js')
      const appointmentFindMany = vi.mocked(prisma.appointment.findMany)
      const mockSendNotification = vi.mocked(webpush.sendNotification)

      appointmentFindMany.mockResolvedValue([
        {
          id: 'apt-1',
          barbershopId: 'shop-1',
          client: {
            id: 'client-1',
            pushSubscription: {
              endpoint: 'https://push.example.com/1',
              keys: { p256dh: 'k1', auth: 'k2' },
            },
          },
          professional: { name: 'John' },
          service: { name: 'Haircut' },
        },
      ] as any)
      mockSendNotification.mockResolvedValue({} as any)

      const result = await service.processReminders()
      expect(result.sent).toBe(1)
      expect(result.errors).toBe(0)
    })

    it('removes invalid subscriptions on error', async () => {
      const { prisma } = await import('../../lib/prisma.js')
      const appointmentFindMany = vi.mocked(prisma.appointment.findMany)
      const clientUpdate = vi.mocked(prisma.client.update)
      const mockSendNotification = vi.mocked(webpush.sendNotification)

      appointmentFindMany.mockResolvedValue([
        {
          id: 'apt-1',
          barbershopId: 'shop-1',
          client: {
            id: 'client-1',
            pushSubscription: {
              endpoint: 'https://push.example.com/1',
              keys: { p256dh: 'k1', auth: 'k2' },
            },
          },
          professional: { name: 'John' },
          service: { name: 'Haircut' },
        },
      ] as any)
      mockSendNotification.mockRejectedValue(new webpush.WebPushError('Gone', 410))
      clientUpdate.mockResolvedValue({} as any)

      const result = await service.processReminders()
      expect(result.errors).toBe(1)
      expect(clientUpdate).toHaveBeenCalledWith({
        where: { id: 'client-1' },
        data: { pushSubscription: null },
      })
    })

    it('handles multiple appointments', async () => {
      const { prisma } = await import('../../lib/prisma.js')
      const appointmentFindMany = vi.mocked(prisma.appointment.findMany)
      const clientUpdate = vi.mocked(prisma.client.update)
      const mockSendNotification = vi.mocked(webpush.sendNotification)

      appointmentFindMany.mockResolvedValue([
        {
          id: 'apt-1',
          barbershopId: 'shop-1',
          client: {
            id: 'client-1',
            pushSubscription: {
              endpoint: 'https://push.example.com/1',
              keys: { p256dh: 'k1', auth: 'k2' },
            },
          },
          professional: { name: 'John' },
          service: { name: 'Haircut' },
        },
        {
          id: 'apt-2',
          barbershopId: 'shop-1',
          client: {
            id: 'client-2',
            pushSubscription: {
              endpoint: 'https://push.example.com/2',
              keys: { p256dh: 'k3', auth: 'k4' },
            },
          },
          professional: { name: 'Jane' },
          service: { name: 'Beard' },
        },
      ] as any)
      mockSendNotification
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce(new webpush.WebPushError('Gone', 410))
      clientUpdate.mockResolvedValue({} as any)

      const result = await service.processReminders()
      expect(result.sent).toBe(1)
      expect(result.errors).toBe(1)
    })
  })
})
