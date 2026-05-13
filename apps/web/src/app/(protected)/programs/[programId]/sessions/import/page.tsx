'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

import { SessionImportForm } from '@/components/imports/session-import-form'
import { ErrorAlert } from '@/components/shared/error-alert'
import { LoadingState } from '@/components/shared/loading-state'
import { PageHeader } from '@/components/shared/page-header'
import { programsApi } from '@/lib/api/client'
import type { Program } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/utils/error-message'

export default function SessionImportPage() {
  const params = useParams<{ programId: string }>()
  const [program, setProgram] = useState<Program | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadProgram() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await programsApi.get(params.programId)
        if (active) {
          setProgram(response.program)
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, 'Unable to load program'))
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadProgram()

    return () => {
      active = false
    }
  }, [params.programId])

  return (
    <div className="space-y-6">
      <PageHeader
        title={program ? `Import sessions into ${program.title}` : 'Import sessions'}
        description="Upload CSV text, preserve row feedback, and reuse client import IDs safely."
        actions={
          <>
            <Link
              href="/programs"
              className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
            >
              Back to programs
            </Link>
            <Link
              href={`/programs/${params.programId}/sessions`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
            >
              Back to sessions
            </Link>
          </>
        }
      />
      {error ? <ErrorAlert message={error} /> : null}
      {isLoading ? <LoadingState label="Loading program..." /> : <SessionImportForm programId={params.programId} />}
    </div>
  )
}
