import { z } from 'zod'

// Slug validation: lowercase, numbers, hyphens; 3-50 chars; no leading/trailing hyphens
export const slugSchema = z
  .string()
  .toLowerCase()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be at most 50 characters')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug must contain only lowercase letters, numbers, and hyphens'
  )

export const selfRegisterSchema = z.object({
  name: z.string().min(1, 'Barbershop name is required'),
  slug: slugSchema,
  adminEmail: z.string().email('Invalid email format'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  adminName: z.string().min(1, 'Admin name is required'),
})

export const updateBarbershopSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
})

export const publicBarbershopInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  isActive: z.boolean(),
})

export type SelfRegisterInput = z.infer<typeof selfRegisterSchema>
export type UpdateBarbershopInput = z.infer<typeof updateBarbershopSchema>
export type PublicBarbershopInfo = z.infer<typeof publicBarbershopInfoSchema>
