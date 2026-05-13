import { clearToken, getToken } from '@/lib/auth/token-store'
import { emitAuthInvalidated } from '@/lib/auth/auth-events'
import type {
  ApiErrorShape,
  AuditLogListResponse,
  AuthMeResponse,
  AuthResponse,
  BulkImportResult,
  PasswordResetConfirmResponse,
  PasswordResetRequestResponse,
  PresignedUploadResponse,
  ProgramListResponse,
  ProgramResponse,
  SessionListResponse,
  SessionResponse,
} from '@/lib/api/types'

export class ApiError extends Error {
  statusCode: number
  code: string
  details: Record<string, unknown>

  constructor(statusCode: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }

  get fieldErrors(): Record<string, string[]> {
    const issues = this.details.issues
    if (typeof issues !== 'object' || issues === null || !('fieldErrors' in issues)) {
      return {}
    }

    const fieldErrors = (issues as { fieldErrors?: Record<string, string[]> }).fieldErrors
    return fieldErrors ?? {}
  }

  get formErrors(): string[] {
    const issues = this.details.issues
    if (typeof issues !== 'object' || issues === null || !('formErrors' in issues)) {
      return []
    }

    const formErrors = (issues as { formErrors?: string[] }).formErrors
    return formErrors ?? []
  }
}

type QueryValue = string | number | boolean | null | undefined

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, QueryValue>
  auth?: boolean
}

function buildUrl(pathname: string, query?: Record<string, QueryValue>) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL

  if (!apiBaseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured')
  }

  const url = new URL(pathname, apiBaseUrl)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') {
        continue
      }
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

async function request<T>(pathname: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers()
  const token = options.auth ? getToken() : null

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(buildUrl(pathname, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  })

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  const payload = text ? (JSON.parse(text) as unknown) : undefined

  if (!response.ok) {
    const errorPayload = payload as ApiErrorShape | undefined
    const apiError = errorPayload?.error

    if (response.status === 401 && options.auth) {
      clearToken()
      emitAuthInvalidated()
    }

    throw new ApiError(
      response.status,
      apiError?.code ?? 'REQUEST_FAILED',
      apiError?.message ?? 'Request failed',
      apiError?.details ?? {}
    )
  }

  return payload as T
}

export const authApi = {
  signup: (body: { email: string; password: string; displayName: string; slug: string }) =>
    request<AuthResponse>('/api/auth/signup', { method: 'POST', body }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body }),
  me: () => request<AuthMeResponse>('/api/auth/me', { auth: true }),
  requestPasswordReset: (body: { email: string }) =>
    request<PasswordResetRequestResponse>('/api/auth/password-reset/request', { method: 'POST', body }),
  confirmPasswordReset: (body: { token: string; newPassword: string }) =>
    request<PasswordResetConfirmResponse>('/api/auth/password-reset/confirm', { method: 'POST', body }),
}

export const programsApi = {
  list: (query?: { limit?: number; offset?: number }) =>
    request<ProgramListResponse>('/api/programs', { auth: true, query }),
  create: (body: { title: string; description: string }) =>
    request<ProgramResponse>('/api/programs', { method: 'POST', body, auth: true }),
  get: (programId: string) => request<ProgramResponse>(`/api/programs/${programId}`, { auth: true }),
  update: (programId: string, body: { title?: string; description?: string }) =>
    request<ProgramResponse>(`/api/programs/${programId}`, { method: 'PATCH', body, auth: true }),
  delete: (programId: string) => request<void>(`/api/programs/${programId}`, { method: 'DELETE', auth: true }),
}

export const sessionsApi = {
  list: (programId: string) => request<SessionListResponse>(`/api/programs/${programId}/sessions`, { auth: true }),
  create: (
    programId: string,
    body: {
      title: string
      description?: string
      durationSeconds?: number
      instructorName?: string
      tags?: string[]
      mediaUrl?: string
      mediaType?: 'audio' | 'video'
    }
  ) => request<SessionResponse>(`/api/programs/${programId}/sessions`, { method: 'POST', body, auth: true }),
  get: (sessionId: string) => request<SessionResponse>(`/api/sessions/${sessionId}`, { auth: true }),
  update: (
    sessionId: string,
    body: {
      title?: string
      description?: string
      durationSeconds?: number | null
      instructorName?: string | null
      tags?: string[]
      mediaUrl?: string | null
      mediaType?: 'audio' | 'video' | null
    }
  ) => request<SessionResponse>(`/api/sessions/${sessionId}`, { method: 'PATCH', body, auth: true }),
  delete: (sessionId: string) => request<void>(`/api/sessions/${sessionId}`, { method: 'DELETE', auth: true }),
  reorder: (programId: string, sessionIds: string[]) =>
    request<SessionListResponse>(`/api/programs/${programId}/sessions/reorder`, {
      method: 'POST',
      body: { sessionIds },
      auth: true,
    }),
}

export const importsApi = {
  importSessions: (programId: string, body: { clientImportId: string; csv: string }) =>
    request<BulkImportResult>(`/api/programs/${programId}/sessions/import`, {
      method: 'POST',
      body,
      auth: true,
    }),
}

export const uploadsApi = {
  presignSessionMedia: (body: { filename: string; contentType: string; contentLength: number }) =>
    request<PresignedUploadResponse>('/api/uploads/session-media/presign', {
      method: 'POST',
      body,
      auth: true,
    }),
}

export const auditApi = {
  list: (query?: { from?: string; to?: string; action?: string; limit?: number; cursor?: string }) =>
    request<AuditLogListResponse>('/api/audit-logs', { auth: true, query }),
}
