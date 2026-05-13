import { z } from 'zod'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const signupFormSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().trim().min(1, 'Display name is required').max(120),
  slug: z.string().trim().min(3, 'Slug must be at least 3 characters').max(120).regex(slugPattern, 'Slug must use lowercase letters, numbers, and hyphens only'),
})

export const loginFormSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordFormSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
})

export const resetPasswordFormSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})
