import { z } from 'zod'

export const programFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim(),
})
