import { z } from 'zod'

import { AUDIT_ACTIONS } from '../../audit/actions'

const singleOptionalString = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.string().trim().min(1).optional()
)

function optionalDateField(field: 'from' | 'to') {
  return singleOptionalString.superRefine((value, ctx) => {
    if (!value) {
      return
    }

    if (Number.isNaN(Date.parse(value))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${field} must be a valid ISO datetime`,
      })
    }
  })
}

export const auditLogsQuerySchema = z
  .object({
    from: optionalDateField('from'),
    to: optionalDateField('to'),
    action: z.preprocess(
      (value) => (Array.isArray(value) ? value[0] : value),
      z.enum(Object.values(AUDIT_ACTIONS) as [string, ...string[]]).optional()
    ),
    limit: z.preprocess(
      (value) => (Array.isArray(value) ? value[0] : value),
      z.coerce.number().int().positive().max(100).default(25)
    ),
    cursor: singleOptionalString,
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to && Date.parse(value.from) > Date.parse(value.to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'from must be less than or equal to to',
        path: ['from'],
      })
    }
  })
  .transform((value) => ({
    from: value.from ? new Date(value.from) : undefined,
    to: value.to ? new Date(value.to) : undefined,
    action: value.action,
    limit: value.limit,
    cursor: value.cursor,
  }))
