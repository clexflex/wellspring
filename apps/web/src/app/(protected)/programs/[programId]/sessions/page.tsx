'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

import { SessionList } from '@/components/sessions/session-list'
import { ErrorAlert } from '@/components/shared/error-alert'
import { LoadingState } from '@/components/shared/loading-state'
import { PageHeader } from '@/components/shared/page-header'
import { programsApi, sessionsApi } from '@/lib/api/client'
import type { Program, Session } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/utils/error-message'

export default function ProgramSessionsPage() {
  const params = useParams<{ programId: string }>()
  const [program, setProgram] = useState<Program | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderSaving, setOrderSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchProgramSessions = useCallback(async () => {
    const [programResponse, sessionsResponse] = await Promise.all([
      programsApi.get(params.programId),
      sessionsApi.list(params.programId),
    ])

    return {
      program: programResponse.program,
      sessions: sessionsResponse.items,
    }
  }, [params.programId])

  useEffect(() => {
    let active = true

    async function loadInitialData() {
      try {
        const response = await fetchProgramSessions()

        if (!active) {
          return
        }

        setProgram(response.program)
        setSessions(response.sessions)
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, 'Unable to load sessions'))
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialData()

    return () => {
      active = false
    }
  }, [fetchProgramSessions])

  async function handleDelete(session: Session) {
    if (!window.confirm(`Delete session "${session.title}"?`)) {
      return
    }

    setDeletingId(session.id)
    setError(null)

    try {
      await sessionsApi.delete(session.id)
      const refreshed = await sessionsApi.list(params.programId)
      setSessions(refreshed.items)
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete session'))
    } finally {
      setDeletingId(null)
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= sessions.length) {
      return
    }

    const previousSessions = sessions
    const nextSessions = [...sessions]
    const [moved] = nextSessions.splice(index, 1)
    nextSessions.splice(swapIndex, 0, moved)
    setSessions(nextSessions.map((session, position) => ({ ...session, position: position + 1 })))
    setOrderSaving(true)
    setError(null)

    try {
      const response = await sessionsApi.reorder(params.programId, nextSessions.map((session) => session.id))
      setSessions(response.items)
    } catch (reorderError) {
      setSessions(previousSessions)
      setError(getErrorMessage(reorderError, 'Unable to reorder sessions'))
    } finally {
      setOrderSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={program ? `${program.title} sessions` : 'Sessions'}
        description="Manage ordered sessions inside this tenant-scoped program."
        actions={
          <>
            <Link
              href="/programs"
              className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
            >
              Back to programs
            </Link>
            <Link
              href={`/programs/${params.programId}/sessions/import`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
            >
              CSV import
            </Link>
            <Link
              href={`/programs/${params.programId}/sessions/new`}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              New session
            </Link>
          </>
        }
      />
      {error ? <ErrorAlert message={error} /> : null}
      {isLoading ? (
        <LoadingState label="Loading sessions..." />
      ) : (
        <SessionList
          programId={params.programId}
          sessions={sessions}
          onDelete={handleDelete}
          onMove={handleMove}
          orderSaving={orderSaving}
          deletingId={deletingId}
        />
      )}
    </div>
  )
}
