import { z } from 'zod'

const singleOptionalString = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.string().trim().min(1).optional()
)

const titleSchema = z.string().trim().min(1)
const descriptionSchema = z.string().trim()

export const listProgramsQuerySchema = z.object({
  limit: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z.coerce.number().int().positive().max(100).default(25)
  ),
  offset: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z.coerce.number().int().min(0).default(0)
  ),
})

export const createProgramSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema.optional().default(''),
  })
  .strict()

export const updateProgramSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.title === undefined && value.description === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field must be provided',
      })
    }
  })

export const programParamsSchema = z.object({
  programId: z.string().uuid(),
})
