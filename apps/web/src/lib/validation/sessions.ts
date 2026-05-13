import { z } from 'zod'

function optionalPositiveInteger(message: string) {
  return z
    .string()
    .trim()
    .transform((value) => (value === '' ? undefined : value))
    .refine((value) => value === undefined || /^\d+$/.test(value), message)
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .refine((value) => value === undefined || value > 0, message)
}

function optionalUrl(message: string) {
  return z
    .string()
    .trim()
    .transform((value) => (value === '' ? undefined : value))
    .refine((value) => value === undefined || z.string().url().safeParse(value).success, message)
}

export const sessionFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim(),
  durationSeconds: optionalPositiveInteger('Duration must be a positive integer'),
  instructorName: z.string().trim().optional(),
  tagsText: z.string().trim(),
  mediaUrl: optionalUrl('Media URL must be a valid URL'),
  mediaType: z.enum(['', 'audio', 'video']),
})

export function normalizeTags(tagsText: string): string[] {
  return Array.from(
    new Set(
      tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  )
}
