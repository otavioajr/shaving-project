import { z } from 'zod'

// Web Push subscription keys schema
export const pushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(1, 'p256dh key is required'),
  auth: z.string().min(1, 'auth key is required'),
})

// Full push subscription schema (matches browser's PushSubscription interface)
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
  expirationTime: z.number().nullable().optional(),
  keys: pushSubscriptionKeysSchema,
})

// Type exports
export type PushSubscriptionKeys = z.infer<typeof pushSubscriptionKeysSchema>
export type PushSubscription = z.infer<typeof pushSubscriptionSchema>

// Notification payload schema
export const notificationPayloadSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  icon: z.string().optional(),
  badge: z.string().optional(),
  data: z.record(z.unknown()).optional(),
})

export type NotificationPayload = z.infer<typeof notificationPayloadSchema>
