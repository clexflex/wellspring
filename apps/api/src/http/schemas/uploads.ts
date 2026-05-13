import { z } from 'zod'

const allowedContentTypes = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const

const invalidFilenamePattern = /[\\/]|[\u0000-\u001f\u007f]/

export const createSessionMediaUploadSchema = z
  .object({
    filename: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine((filename) => !invalidFilenamePattern.test(filename), {
        message: 'filename contains unsupported characters',
      }),
    contentType: z.enum(allowedContentTypes),
    contentLength: z.number().int().positive(),
  })
  .strict()
