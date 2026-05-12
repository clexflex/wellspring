import 'express-serve-static-core'

declare module 'express-serve-static-core' {
  interface Request {
    auth?: {
      creatorId: string
      email: string
    }
    tenantId?: string | null
  }
}
