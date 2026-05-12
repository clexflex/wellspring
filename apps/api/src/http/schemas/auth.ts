import { z } from 'zod'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  displayName: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(3).max(120).regex(slugPattern),
})

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email(),
})

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
})
