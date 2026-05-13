import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive(),
  APP_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(1),
  DATABASE_ADMIN_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().min(1),
  PASSWORD_RESET_TOKEN_EXPIRES_MINUTES: z.coerce.number().int().positive(),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),
  S3_PUBLIC_BASE_URL: z.string().url(),
  S3_PRESIGNED_URL_EXPIRES_SECONDS: z.coerce.number().int().positive().max(3600),
  MAX_MEDIA_UPLOAD_BYTES: z.coerce.number().int().positive(),
})

export type AppEnv = z.infer<typeof envSchema>

let cachedEnv: AppEnv | null = null

export function loadEnv(rawEnv: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(rawEnv)

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`)
  }

  return parsed.data
}

export function getEnv(): AppEnv {
  cachedEnv ??= loadEnv()
  return cachedEnv
}

export function resetEnvForTests(): void {
  cachedEnv = null
}
