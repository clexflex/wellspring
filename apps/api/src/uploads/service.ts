import { randomUUID } from 'node:crypto'

import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from '../audit/actions'
import { recordAuditLog } from '../audit/record'
import { getEnv } from '../config/env'
import { withTenantContext } from '../db/tenant-context'
import { AppError } from '../http/errors'
import { presentPresignedSessionMediaUpload } from './presenters'
import { createPresignedPutUrl } from './s3-client'

const CONTENT_TYPE_TO_EXTENSION: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}

function validationError(fieldErrors: Record<string, string[]> = {}, formErrors: string[] = []): never {
  throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload', {
    issues: {
      fieldErrors,
      formErrors,
    },
  })
}

function extractNormalizedExtension(filename: string): string | null {
  const trimmed = filename.trim()
  const lastDotIndex = trimmed.lastIndexOf('.')

  if (lastDotIndex < 0) {
    return null
  }

  if (lastDotIndex === trimmed.length - 1) {
    validationError(
      {
        filename: ['filename extension is invalid'],
      },
      []
    )
  }

  const extension = trimmed.slice(lastDotIndex + 1).toLowerCase()
  if (!/^[a-z0-9]+$/.test(extension)) {
    validationError(
      {
        filename: ['filename extension contains unsupported characters'],
      },
      []
    )
  }

  return extension
}

function buildPublicUrl(publicBaseUrl: string, key: string): string {
  return `${publicBaseUrl.replace(/\/+$/, '')}/${key}`
}

export async function createSessionMediaUploadUrl(input: {
  creatorId: string
  filename: string
  contentType: string
  contentLength: number
}) {
  const env = getEnv()

  if (input.contentLength > env.MAX_MEDIA_UPLOAD_BYTES) {
    validationError(
      {
        contentLength: [`contentLength must be less than or equal to ${env.MAX_MEDIA_UPLOAD_BYTES}`],
      },
      []
    )
  }

  const expectedExtension = CONTENT_TYPE_TO_EXTENSION[input.contentType]
  if (!expectedExtension) {
    validationError(
      {
        contentType: ['contentType is not supported'],
      },
      []
    )
  }

  const providedExtension = extractNormalizedExtension(input.filename)
  if (providedExtension && providedExtension !== expectedExtension) {
    validationError(
      {
        filename: [
          `filename extension '.${providedExtension}' does not match contentType '${input.contentType}'`,
        ],
      },
      []
    )
  }

  const objectId = randomUUID()
  const key = `creators/${input.creatorId}/session-media/${objectId}.${expectedExtension}`

  const uploadUrl = await createPresignedPutUrl({
    key,
    contentType: input.contentType,
    contentLength: input.contentLength,
    expiresInSeconds: env.S3_PRESIGNED_URL_EXPIRES_SECONDS,
  })

  const publicUrl = buildPublicUrl(env.S3_PUBLIC_BASE_URL, key)

  await withTenantContext(input.creatorId, async (client) => {
    await recordAuditLog(client, {
      actorCreatorId: input.creatorId,
      action: AUDIT_ACTIONS.UPLOAD_URL_CREATED,
      targetType: AUDIT_TARGET_TYPES.UPLOAD,
      targetId: objectId,
      metadata: {
        key,
        contentType: input.contentType,
        contentLength: input.contentLength,
        expiresInSeconds: env.S3_PRESIGNED_URL_EXPIRES_SECONDS,
        originalFilename: input.filename,
      },
    })
  })

  return presentPresignedSessionMediaUpload({
    uploadUrl,
    key,
    publicUrl,
    expiresInSeconds: env.S3_PRESIGNED_URL_EXPIRES_SECONDS,
  })
}
