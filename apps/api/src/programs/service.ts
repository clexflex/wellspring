import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from '../audit/actions'
import { recordAuditLog } from '../audit/record'
import { AppError } from '../http/errors'
import { withTenantContext } from '../db/tenant-context'
import { createProgram, deleteProgram, findProgramById, listPrograms, updateProgram } from './repository'
import { presentProgram } from './presenters'

function notFound(): never {
  throw new AppError(404, 'NOT_FOUND', 'Resource not found')
}

export async function listCreatorPrograms(input: { creatorId: string; limit: number; offset: number }) {
  return withTenantContext(input.creatorId, async (client) => {
    const rows = await listPrograms(client, {
      limit: input.limit + 1,
      offset: input.offset,
    })

    const hasMore = rows.length > input.limit
    const pageRows = hasMore ? rows.slice(0, input.limit) : rows

    return {
      items: pageRows.map(presentProgram),
      pageInfo: {
        limit: input.limit,
        offset: input.offset,
        hasMore,
      },
    }
  })
}

export async function getCreatorProgram(input: { creatorId: string; programId: string }) {
  return withTenantContext(input.creatorId, async (client) => {
    const program = await findProgramById(client, input.programId)

    if (!program) {
      notFound()
    }

    return {
      program: presentProgram(program),
    }
  })
}

export async function createCreatorProgram(input: {
  creatorId: string
  title: string
  description: string
}) {
  return withTenantContext(input.creatorId, async (client) => {
    const program = await createProgram(client, {
      title: input.title,
      description: input.description,
    })

    await recordAuditLog(client, {
      actorCreatorId: input.creatorId,
      action: AUDIT_ACTIONS.PROGRAM_CREATED,
      targetType: AUDIT_TARGET_TYPES.PROGRAM,
      targetId: program.id,
      metadata: {
        title: program.title,
      },
    })

    return {
      program: presentProgram(program),
    }
  })
}

export async function updateCreatorProgram(input: {
  creatorId: string
  programId: string
  title?: string
  description?: string
}) {
  return withTenantContext(input.creatorId, async (client) => {
    const existingProgram = await findProgramById(client, input.programId)

    if (!existingProgram) {
      notFound()
    }

    const nextTitle = input.title ?? existingProgram.title
    const nextDescription = input.description ?? existingProgram.description
    const changedFields = ['title', 'description'].filter((field) => field in input)

    const program = await updateProgram(client, {
      programId: input.programId,
      title: nextTitle,
      description: nextDescription,
    })

    if (!program) {
      notFound()
    }

    await recordAuditLog(client, {
      actorCreatorId: input.creatorId,
      action: AUDIT_ACTIONS.PROGRAM_UPDATED,
      targetType: AUDIT_TARGET_TYPES.PROGRAM,
      targetId: program.id,
      metadata: {
        changedFields,
      },
    })

    return {
      program: presentProgram(program),
    }
  })
}

export async function deleteCreatorProgram(input: { creatorId: string; programId: string }) {
  return withTenantContext(input.creatorId, async (client) => {
    const deletedProgram = await deleteProgram(client, input.programId)

    if (!deletedProgram) {
      notFound()
    }

    await recordAuditLog(client, {
      actorCreatorId: input.creatorId,
      action: AUDIT_ACTIONS.PROGRAM_DELETED,
      targetType: AUDIT_TARGET_TYPES.PROGRAM,
      targetId: deletedProgram.id,
      metadata: {
        title: deletedProgram.title,
      },
    })
  })
}
