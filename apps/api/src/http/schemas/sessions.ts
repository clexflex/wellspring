import { z } from 'zod'

const titleSchema = z.string().trim().min(1)
const descriptionSchema = z.string().trim()
const optionalTrimmedString = z.string().trim().min(1)
const mediaTypeSchema = z.enum(['audio', 'video'])

export const sessionParamsSchema = z.object({
  sessionId: z.string().uuid(),
})

export const programSessionParamsSchema = z.object({
  programId: z.string().uuid(),
})

export const createSessionSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema.optional().default(''),
    durationSeconds: z.number().int().positive().optional(),
    position: z.number().int().positive().optional(),
    instructorName: optionalTrimmedString.optional(),
    tags: z.array(z.string().trim().min(1)).optional().default([]),
    mediaUrl: z.string().url().optional(),
    mediaType: mediaTypeSchema.optional(),
  })
  .strict()

export const updateSessionSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    durationSeconds: z.number().int().positive().nullable().optional(),
    instructorName: optionalTrimmedString.nullable().optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
    mediaUrl: z.string().url().nullable().optional(),
    mediaType: mediaTypeSchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field must be provided',
      })
    }
  })

export const reorderSessionsSchema = z
  .object({
    sessionIds: z.array(z.string().uuid()).min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.sessionIds).size !== value.sessionIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sessionIds must not contain duplicates',
        path: ['sessionIds'],
      })
    }
  })
