import { createHash, randomBytes } from 'node:crypto'

export function generateRawResetToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
