import type { QueryResultRow } from 'pg'

export type ProgramRecord = QueryResultRow & {
  id: string
  creator_id: string
  title: string
  description: string
  created_at: Date
  updated_at: Date
}

export function presentProgram(program: ProgramRecord) {
  return {
    id: program.id,
    title: program.title,
    description: program.description,
    createdAt: program.created_at.toISOString(),
    updatedAt: program.updated_at.toISOString(),
  }
}
