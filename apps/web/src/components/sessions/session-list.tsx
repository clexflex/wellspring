'use client'

import Link from 'next/link'

import type { Session } from '@/lib/api/types'
import { EmptyState } from '@/components/shared/empty-state'
import { SessionReorderControls } from '@/components/sessions/session-reorder-controls'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SessionList({
  programId,
  sessions,
  onDelete,
  onMove,
  orderSaving,
  deletingId,
}: {
  programId: string
  sessions: Session[]
  onDelete: (session: Session) => void
  onMove: (index: number, direction: 'up' | 'down') => void
  orderSaving: boolean
  deletingId: string | null
}) {
  if (sessions.length === 0) {
    return <EmptyState title="No sessions yet" description="Add sessions to this program, upload media, or import from CSV." />
  }

  return (
    <div className="grid gap-4">
      {sessions.map((session, index) => (
        <Card key={session.id}>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge>Position {session.position}</Badge>
                  {session.mediaType ? <Badge className="bg-accent text-accent-foreground">{session.mediaType}</Badge> : null}
                </div>
                <CardTitle>{session.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{session.description || 'No description'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SessionReorderControls
                  canMoveUp={index > 0}
                  canMoveDown={index < sessions.length - 1}
                  disabled={orderSaving}
                  onMoveUp={() => onMove(index, 'up')}
                  onMoveDown={() => onMove(index, 'down')}
                />
                <Link href={`/sessions/${session.id}/edit`} className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-accent">
                  Edit
                </Link>
                <Button variant="destructive" size="sm" disabled={deletingId === session.id} onClick={() => onDelete(session)}>
                  {deletingId === session.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            <div className="grid gap-2 md:grid-cols-2">
              <p>Duration: {session.durationSeconds ? `${session.durationSeconds}s` : 'Not set'}</p>
              <p>Instructor: {session.instructorName ?? 'Not set'}</p>
              <p>Tags: {session.tags.length > 0 ? session.tags.join(', ') : 'None'}</p>
              <p>
                Media URL:{' '}
                {session.mediaUrl ? (
                  <a href={session.mediaUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    Open media
                  </a>
                ) : (
                  'Not set'
                )}
              </p>
            </div>
            <div className="mt-4">
              <Link href={`/programs/${programId}/sessions/import`} className="text-sm text-primary hover:underline">
                Open CSV import for this program
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
