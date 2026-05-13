export type ApiErrorShape = {
  error: {
    code: string
    message: string
    details: Record<string, unknown>
  }
}

export type Creator = {
  id: string
  email: string
  displayName: string
  slug: string
  createdAt: string
  updatedAt: string
}

export type AuthResponse = {
  creator: Creator
  token: string
}

export type AuthMeResponse = {
  creator: Creator
}

export type PasswordResetRequestResponse = {
  success: true
  debug?: {
    resetToken: string
    resetUrl: string
  }
}

export type PasswordResetConfirmResponse = {
  success: true
}

export type Program = {
  id: string
  title: string
  description: string
  createdAt: string
  updatedAt: string
}

export type ProgramListResponse = {
  items: Program[]
  pageInfo: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

export type ProgramResponse = {
  program: Program
}

export type Session = {
  id: string
  programId: string
  title: string
  description: string
  durationSeconds: number | null
  position: number
  instructorName: string | null
  tags: string[]
  mediaUrl: string | null
  mediaType: 'audio' | 'video' | null
  createdAt: string
  updatedAt: string
}

export type SessionResponse = {
  session: Session
}

export type SessionListResponse = {
  items: Session[]
}

export type BulkImportRow = {
  rowNumber: number
  status: 'inserted' | 'failed'
  sessionId: string | null
  errors: string[]
}

export type BulkImportResult = {
  import: {
    id: string
    clientImportId: string
    status: 'completed' | 'completed_with_errors' | 'failed'
    insertedCount: number
    failedCount: number
    replayed: boolean
    createdAt: string
    completedAt: string
  }
  rows: BulkImportRow[]
}

export type PresignedUploadResponse = {
  upload: {
    uploadUrl: string
    key: string
    publicUrl: string
    expiresInSeconds: number
  }
}

export type AuditAction =
  | 'CREATOR_SIGNED_UP'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_CONFIRMED'
  | 'PROGRAM_CREATED'
  | 'PROGRAM_UPDATED'
  | 'PROGRAM_DELETED'
  | 'SESSION_CREATED'
  | 'SESSION_UPDATED'
  | 'SESSION_DELETED'
  | 'SESSIONS_REORDERED'
  | 'SESSIONS_IMPORTED'
  | 'UPLOAD_URL_CREATED'

export type AuditLog = {
  id: string
  actorCreatorId: string
  action: AuditAction
  targetType: string
  targetId: string
  metadata: Record<string, unknown>
  createdAt: string
}

export type AuditLogListResponse = {
  items: AuditLog[]
  pageInfo: {
    hasMore: boolean
    nextCursor: string | null
  }
}
