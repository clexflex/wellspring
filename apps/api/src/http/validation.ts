import { ZodTypeAny } from 'zod'

import { AppError } from './errors'

export function parseWithSchema<TSchema extends ZodTypeAny>(schema: TSchema, input: unknown) {
  const parsed = schema.safeParse(input)

  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload', {
      issues: parsed.error.flatten(),
    })
  }

  return parsed.data
}
