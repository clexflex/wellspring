import { z } from 'zod'

export const importProgramParamsSchema = z.object({
  programId: z.string().uuid(),
})

export const importSessionsSchema = z
  .object({
    clientImportId: z.string().trim().min(1),
    csv: z.string().min(1),
  })
  .strict()
