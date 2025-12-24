import webpush from 'web-push'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import type { Client } from '@prisma/client'
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

// Appointment with relations for reminder formatting (Prisma-generated type)
export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    client: true
    professional: true
    service: true
  }
}>

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
      body: `Você tem um agendamento em 15 minutos com ${appointment.professional.name} - ${appointment.service.name}`,
      data: {
        appointmentId: appointment.id,
        type: 'appointment_reminder',
      },
    }

    return this.sendNotification(subscription, payload)
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
          pushSubscription: { not: Prisma.DbNull },
          isActive: true,
        },
      },
      include: {
        client: true,
        professional: true,
        service: true,
      },
    })
  }

  /**
   * Execute tasks with limited concurrency using worker pool pattern
   * @param items Array of items to process
   * @param limit Maximum concurrent tasks
   * @param worker Function that processes each item
   * @returns Array of results in the same order as items
   *
   * TODO: Code review feedback (PR review - Junior):
   * 1. Improve defensive pattern: Change `while (queue.length > 0) { shift()! }` to `while (true) { const task = shift(); if (!task) break }`
   * 2. Remove try/catch block with unsafe `as R` cast - let workers handle their own errors
   *    (Current usage in processReminders already has internal try/catch, making this redundant)
   * See: https://github.com/anthropics/claude-code/pull/XXX#discussion_rXXX
   */
  private async runWithConcurrency<T, R>(
    items: T[],
    limit: number,
    worker: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = new Array(items.length)
    const queue = [...items.entries()]

    const runWorker = async () => {
      while (queue.length > 0) {
        const [index, item] = queue.shift()!
        try {
          results[index] = await worker(item, index)
        } catch (error) {
          // Convert unexpected errors to a result-like object
          // This ensures we don't abort the batch
          // TODO: Remove this try/catch - unsafe type cast `as R` and redundant with worker error handling
          results[index] = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          } as R
        }
      }
    }

    const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker())
    await Promise.all(workers)
    return results
  }

  /**
   * Process all upcoming appointment reminders
   * Uses limited concurrency (5) to send reminders in parallel
   * Returns statistics for cron response
   */
  async processReminders(): Promise<{ sent: number; errors: number }> {
    const appointments = await this.findUpcomingAppointments()

    if (appointments.length === 0) {
      return { sent: 0, errors: 0 }
    }

    // Send reminders with concurrency limit of 5
    const results = await this.runWithConcurrency(appointments, 5, async (appointment) => {
      try {
        return await this.sendAppointmentReminder(appointment.client, appointment)
      } catch (error) {
        // Convert unexpected errors to SendResult
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        } as SendResult
      }
    })

    let sent = 0
    let errors = 0
    const clientsToRemoveSubscription: string[] = []

    // Process results and collect invalid subscriptions for batch removal
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const appointment = appointments[i]

      if (result.success) {
        sent++
      } else {
        errors++

        // Collect invalid subscription clients for batch removal
        if (result.shouldRemoveSubscription) {
          clientsToRemoveSubscription.push(appointment.client.id)
        }
      }
    }

    // Batch remove all invalid subscriptions in a single query
    if (clientsToRemoveSubscription.length > 0) {
      await prisma.client.updateMany({
        where: { id: { in: clientsToRemoveSubscription } },
        data: { pushSubscription: Prisma.DbNull },
      })
    }

    return { sent, errors }
  }
}

export const notificationService = new NotificationService()
