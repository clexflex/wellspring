import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from '../audit/actions'
import { recordAuditLog } from '../audit/record'
import { AppError } from '../http/errors'
import { findProgramById } from '../programs/repository'
import { withTenantContext } from '../db/tenant-context'
import { presentSession } from './presenters'
import {
  addTemporaryOffsetToProgramSessions,
  addTemporaryOffsetToSessionsAfter,
  addTemporaryOffsetToSessionsAtOrAfter,
  createSession,
  deleteSession,
  findSessionById,
  finalizeShiftedSessionsDown,
  finalizeShiftedSessionsUp,
  getProgramSessionStats,
  listSessionsByProgram,
  setProgramSessionOrder,
  updateSession,
} from './repository'

function notFound(): never {
  throw new AppError(404, 'NOT_FOUND', 'Resource not found')
}

function validationError(fieldErrors: Record<string, string[]> = {}, formErrors: string[] = []): never {
  throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload', {
    issues: {
      fieldErrors,
      formErrors,
    },
  })
}

function buildOffset(maxPosition: number, count: number): number {
  return maxPosition + count + 1
}

async function requireProgram(client: Parameters<typeof findProgramById>[0], programId: string) {
  const program = await findProgramById(client, programId)

  if (!program) {
    notFound()
  }

  return program
}

export async function listCreatorProgramSessions(input: { creatorId: string; programId: string }) {
  return withTenantContext(input.creatorId, async (client) => {
    await requireProgram(client, input.programId)
    const sessions = await listSessionsByProgram(client, input.programId)

    return {
      items: sessions.map(presentSession),
    }
  })
}

export async function createCreatorSession(input: {
  creatorId: string
  programId: string
  title: string
  description: string
  durationSeconds?: number
  position?: number
  instructorName?: string
  tags: string[]
  mediaUrl?: string
  mediaType?: 'audio' | 'video'
}) {
  return withTenantContext(input.creatorId, async (client) => {
    await requireProgram(client, input.programId)

    const stats = await getProgramSessionStats(client, input.programId)
    const nextPosition = input.position ?? stats.count + 1

    if (nextPosition > stats.count + 1) {
      validationError({
        position: ['Position must be less than or equal to the next available slot'],
      })
    }

    if (input.position !== undefined && nextPosition <= stats.count) {
      const offset = buildOffset(stats.maxPosition, stats.count)
      await addTemporaryOffsetToSessionsAtOrAfter(client, {
        programId: input.programId,
        fromPosition: nextPosition,
        offset,
      })

      await finalizeShiftedSessionsUp(client, {
        programId: input.programId,
        thresholdPosition: nextPosition + offset,
        offset,
      })
    }

    const session = await createSession(client, {
      programId: input.programId,
      title: input.title,
      description: input.description,
      durationSeconds: input.durationSeconds ?? null,
      position: nextPosition,
      instructorName: input.instructorName ?? null,
      tags: input.tags,
      mediaUrl: input.mediaUrl ?? null,
      mediaType: input.mediaType ?? null,
    })

    await recordAuditLog(client, {
      actorCreatorId: input.creatorId,
      action: AUDIT_ACTIONS.SESSION_CREATED,
      targetType: AUDIT_TARGET_TYPES.SESSION,
      targetId: session.id,
      metadata: {
        title: session.title,
        position: session.position,
      },
    })

    return {
      session: presentSession(session),
    }
  })
}

export async function getCreatorSession(input: { creatorId: string; sessionId: string }) {
  return withTenantContext(input.creatorId, async (client) => {
    const session = await findSessionById(client, input.sessionId)

    if (!session) {
      notFound()
    }

    return {
      session: presentSession(session),
    }
  })
}

export async function updateCreatorSession(input: {
  creatorId: string
  sessionId: string
  title?: string
  description?: string
  durationSeconds?: number
  instructorName?: string
  tags?: string[]
  mediaUrl?: string
  mediaType?: 'audio' | 'video'
}) {
  return withTenantContext(input.creatorId, async (client) => {
    const existingSession = await findSessionById(client, input.sessionId)

    if (!existingSession) {
      notFound()
    }

    const changedFields = [
      'title',
      'description',
      'durationSeconds',
      'instructorName',
      'tags',
      'mediaUrl',
      'mediaType',
    ].filter((field) => field in input)

    const session = await updateSession(client, {
      sessionId: input.sessionId,
      title: input.title ?? existingSession.title,
      description: input.description ?? existingSession.description,
      durationSeconds: input.durationSeconds ?? existingSession.duration_seconds,
      position: existingSession.position,
      instructorName: input.instructorName ?? existingSession.instructor_name,
      tags: input.tags ?? existingSession.tags,
      mediaUrl: input.mediaUrl ?? existingSession.media_url,
      mediaType: input.mediaType ?? existingSession.media_type,
    })

    if (!session) {
      notFound()
    }

    await recordAuditLog(client, {
      actorCreatorId: input.creatorId,
      action: AUDIT_ACTIONS.SESSION_UPDATED,
      targetType: AUDIT_TARGET_TYPES.SESSION,
      targetId: session.id,
      metadata: {
        changedFields,
      },
    })

    return {
      session: presentSession(session),
    }
  })
}

export async function deleteCreatorSession(input: { creatorId: string; sessionId: string }) {
  return withTenantContext(input.creatorId, async (client) => {
    const deletedSession = await deleteSession(client, input.sessionId)

    if (!deletedSession) {
      notFound()
    }

    const stats = await getProgramSessionStats(client, deletedSession.program_id)
    const offset = Math.max(1, stats.count + 1)

    await addTemporaryOffsetToSessionsAfter(client, {
      programId: deletedSession.program_id,
      afterPosition: deletedSession.position,
      offset,
    })

    await finalizeShiftedSessionsDown(client, {
      programId: deletedSession.program_id,
      thresholdPosition: deletedSession.position + 1 + offset,
      offset,
    })

    await recordAuditLog(client, {
      actorCreatorId: input.creatorId,
      action: AUDIT_ACTIONS.SESSION_DELETED,
      targetType: AUDIT_TARGET_TYPES.SESSION,
      targetId: deletedSession.id,
      metadata: {
        title: deletedSession.title,
        position: deletedSession.position,
      },
    })
  })
}

export async function reorderCreatorProgramSessions(input: {
  creatorId: string
  programId: string
  sessionIds: string[]
}) {
  return withTenantContext(input.creatorId, async (client) => {
    await requireProgram(client, input.programId)

    const currentSessions = await listSessionsByProgram(client, input.programId)
    const currentIds = currentSessions.map((session) => session.id)
    const uniqueIds = new Set(input.sessionIds)

    if (uniqueIds.size !== input.sessionIds.length) {
      validationError({
        sessionIds: ['sessionIds must not contain duplicates'],
      })
    }

    if (input.sessionIds.length !== currentIds.length) {
      validationError({
        sessionIds: ['sessionIds must exactly match the current sessions for this program'],
      })
    }

    const currentIdSet = new Set(currentIds)

    if (!input.sessionIds.every((sessionId) => currentIdSet.has(sessionId))) {
      validationError({
        sessionIds: ['sessionIds must exactly match the current sessions for this program'],
      })
    }

    const stats = await getProgramSessionStats(client, input.programId)
    const offset = buildOffset(stats.maxPosition, stats.count)

    await addTemporaryOffsetToProgramSessions(client, {
      programId: input.programId,
      offset,
    })

    await setProgramSessionOrder(client, {
      sessionIds: input.sessionIds,
    })

    await recordAuditLog(client, {
      actorCreatorId: input.creatorId,
      action: AUDIT_ACTIONS.SESSIONS_REORDERED,
      targetType: AUDIT_TARGET_TYPES.PROGRAM,
      targetId: input.programId,
      metadata: {
        sessionIds: input.sessionIds,
      },
    })

    const sessions = await listSessionsByProgram(client, input.programId)

    return {
      items: sessions.map(presentSession),
    }
  })
}
