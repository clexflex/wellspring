'use client'

import { useRouter, useParams } from 'next/navigation'

import { PageHeader } from '@/components/shared/page-header'
import { SessionForm } from '@/components/sessions/session-form'
import { sessionsApi } from '@/lib/api/client'

export default function NewSessionPage() {
  const params = useParams<{ programId: string }>()
  const router = useRouter()

  return (
    <div className="space-y-6">
      <PageHeader title="Create session" description="Add a new session to this program." />
      <SessionForm
        title="Session details"
        description="Capture metadata, optional media, and creator-facing tags."
        submitLabel="Create session"
        cancelHref={`/programs/${params.programId}/sessions`}
        mode="create"
        onSubmit={async (payload) => {
          await sessionsApi.create(params.programId, {
            title: payload.title ?? '',
            description: payload.description,
            durationSeconds: payload.durationSeconds ?? undefined,
            instructorName: payload.instructorName ?? undefined,
            tags: payload.tags,
            mediaUrl: payload.mediaUrl ?? undefined,
            mediaType: payload.mediaType ?? undefined,
          })
          router.replace(`/programs/${params.programId}/sessions`)
        }}
      />
    </div>
  )
}
