'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { SessionForm } from '@/components/sessions/session-form'
import { ErrorAlert } from '@/components/shared/error-alert'
import { LoadingState } from '@/components/shared/loading-state'
import { PageHeader } from '@/components/shared/page-header'
import { sessionsApi } from '@/lib/api/client'
import type { Session } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/utils/error-message'

export default function EditSessionPage() {
  const params = useParams<{ sessionId: string }>()
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadSession() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await sessionsApi.get(params.sessionId)
        if (active) {
          setSession(response.session)
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, 'Unable to load session'))
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadSession()

    return () => {
      active = false
    }
  }, [params.sessionId])

  return (
    <div className="space-y-6">
      <PageHeader title="Edit session" description="Update session metadata, tags, and media references." />
      {error ? <ErrorAlert message={error} /> : null}
      {isLoading ? (
        <LoadingState label="Loading session..." />
      ) : session ? (
        <SessionForm
          title={`Edit ${session.title}`}
          description="Keep session metadata current for this creator program."
          initialSession={session}
          submitLabel="Save changes"
          cancelHref={`/programs/${session.programId}/sessions`}
          mode="edit"
          onSubmit={async (payload) => {
            await sessionsApi.update(params.sessionId, payload)
            router.replace(`/programs/${session.programId}/sessions`)
          }}
        />
      ) : null}
    </div>
  )
}
