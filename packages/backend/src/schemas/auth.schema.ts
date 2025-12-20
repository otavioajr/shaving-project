import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export const otpRequestSchema = z.object({
  email: z.string().email(),
})

export const otpVerifySchema = z.object({
  email: z.string().email(),
  otp: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must be numeric'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
export type OtpRequestInput = z.infer<typeof otpRequestSchema>
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>
