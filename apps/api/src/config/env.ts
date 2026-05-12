import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive(),
  APP_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(1),
  DATABASE_ADMIN_URL: z.string().min(1),
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
