'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { ProgramForm } from '@/components/programs/program-form'
import { ErrorAlert } from '@/components/shared/error-alert'
import { LoadingState } from '@/components/shared/loading-state'
import { PageHeader } from '@/components/shared/page-header'
import { programsApi } from '@/lib/api/client'
import type { Program } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/utils/error-message'

export default function EditProgramPage() {
  const params = useParams<{ programId: string }>()
  const router = useRouter()
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
      <PageHeader title="Edit program" description="Update program details without exposing tenant identifiers." />
      {error ? <ErrorAlert message={error} /> : null}
      {isLoading ? (
        <LoadingState label="Loading program..." />
      ) : program ? (
        <ProgramForm
          title={`Edit ${program.title}`}
          description="Update the title or description for this program."
          initialValues={{ title: program.title, description: program.description }}
          submitLabel="Save changes"
          cancelHref="/programs"
          onSubmit={async (values) => {
            await programsApi.update(params.programId, values)
            router.replace('/programs')
          }}
        />
      ) : null}
    </div>
  )
}
