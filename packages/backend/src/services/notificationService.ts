import webpush from 'web-push'
import { prisma } from '../lib/prisma.js'
import type { Client, Appointment, Professional, Service } from '@prisma/client'
import {
  pushSubscriptionSchema,
  type PushSubscription,
  type NotificationPayload,
} from '../schemas/notification.schema.js'
import { addMinutes } from 'date-fns'

// Result type for send operations
export interface SendResult {
  success: boolean
  error?: string
  shouldRemoveSubscription?: boolean
}

// Appointment with relations for reminder formatting
export interface AppointmentWithRelations extends Appointment {
  client: Client
  professional: Professional
  service: Service
}

export class NotificationService {
  private vapidConfigured = false

  /**
   * Configure VAPID keys (lazy initialization)
   */
  private ensureVapidConfig(): void {
    if (this.vapidConfigured) return

    const publicKey = process.env.VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    const subject = process.env.VAPID_SUBJECT

    if (!publicKey || !privateKey || !subject) {
      throw new Error(
        'VAPID keys not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.'
      )
    }

    webpush.setVapidDetails(subject, publicKey, privateKey)
    this.vapidConfigured = true
  }

  /**
   * Validate push subscription format
   */
  validateSubscription(subscription: unknown): PushSubscription | null {
    const result = pushSubscriptionSchema.safeParse(subscription)
    return result.success ? result.data : null
  }

  /**
   * Send a push notification to a subscription
   */
  async sendNotification(
    subscription: PushSubscription,
    payload: NotificationPayload
  ): Promise<SendResult> {
    try {
      this.ensureVapidConfig()

      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        },
        JSON.stringify(payload)
      )

      return { success: true }
    } catch (error) {
      // Handle web-push specific errors
      if (error instanceof webpush.WebPushError) {
        const statusCode = error.statusCode

        // 410 Gone or 404 Not Found = subscription expired/invalid
        if (statusCode === 410 || statusCode === 404) {
          return {
            success: false,
            error: 'Subscription expired or invalid',
            shouldRemoveSubscription: true,
          }
        }

        // 429 Too Many Requests
        if (statusCode === 429) {
          return {
            success: false,
            error: 'Rate limit exceeded',
          }
        }

        return {
          success: false,
          error: `Push failed with status ${statusCode}`,
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Send appointment reminder to a client
   */
  async sendAppointmentReminder(
    client: Client,
    appointment: AppointmentWithRelations
  ): Promise<SendResult> {
    // Validate subscription exists and is valid
    if (!client.pushSubscription) {
      return { success: false, error: 'No push subscription' }
    }

    const subscription = this.validateSubscription(client.pushSubscription)
    if (!subscription) {
      return {
        success: false,
        error: 'Invalid subscription format',
        shouldRemoveSubscription: true,
      }
    }

    const payload: NotificationPayload = {
      title: 'Lembrete de Agendamento',
      body: `Voce tem um agendamento em 15 minutos com ${appointment.professional.name} - ${appointment.service.name}`,
      data: {
        appointmentId: appointment.id,
        type: 'appointment_reminder',
      },
    }

    return this.sendNotification(subscription, payload)
  }

  /**
   * Remove invalid subscription from client
   */
  async removeInvalidSubscription(clientId: string): Promise<void> {
    await prisma.client.update({
      where: { id: clientId },
      data: { pushSubscription: null },
    })
  }

  /**
   * Find upcoming appointments for notification (next 15 minutes)
   * Uses a 1-minute window (15-16 min) to avoid re-sending on subsequent cron runs
   */
  async findUpcomingAppointments(): Promise<AppointmentWithRelations[]> {
    const now = new Date()
    const in15Minutes = addMinutes(now, 15)
    const in16Minutes = addMinutes(now, 16) // Window to avoid re-sending

    return prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        date: {
          gte: in15Minutes,
          lt: in16Minutes,
        },
        client: {
          pushSubscription: { not: null },
          isActive: true,
        },
      },
      include: {
        client: true,
        professional: true,
        service: true,
      },
    }) as Promise<AppointmentWithRelations[]>
  }

  /**
   * Process all upcoming appointment reminders
   * Returns statistics for cron response
   */
  async processReminders(): Promise<{ sent: number; errors: number }> {
    const appointments = await this.findUpcomingAppointments()
    let sent = 0
    let errors = 0

    for (const appointment of appointments) {
      const result = await this.sendAppointmentReminder(appointment.client, appointment)

      if (result.success) {
        sent++
      } else {
        errors++

        // Remove invalid subscriptions
        if (result.shouldRemoveSubscription) {
          await this.removeInvalidSubscription(appointment.client.id)
        }
      }
    }

    return { sent, errors }
  }
}

export const notificationService = new NotificationService()
