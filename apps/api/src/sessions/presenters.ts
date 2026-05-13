import type { QueryResultRow } from 'pg'

export type SessionRecord = QueryResultRow & {
  id: string
  creator_id: string
  program_id: string
  title: string
  description: string
  duration_seconds: number | null
  position: number
  instructor_name: string | null
  tags: string[]
  media_url: string | null
  media_type: 'audio' | 'video' | null
  created_at: Date
  updated_at: Date
}

export function presentSession(session: SessionRecord) {
  return {
    id: session.id,
    programId: session.program_id,
    title: session.title,
    description: session.description,
    durationSeconds: session.duration_seconds,
    position: session.position,
    instructorName: session.instructor_name,
    tags: session.tags,
    mediaUrl: session.media_url,
    mediaType: session.media_type,
    createdAt: session.created_at.toISOString(),
    updatedAt: session.updated_at.toISOString(),
  }
}
