'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { ErrorAlert } from '@/components/shared/error-alert'
import { LoadingState } from '@/components/shared/loading-state'
import { PageHeader } from '@/components/shared/page-header'
import { ProgramList } from '@/components/programs/program-list'
import { programsApi } from '@/lib/api/client'
import type { Program } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/utils/error-message'

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadPrograms() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await programsApi.list({ limit: 25, offset: 0 })
        if (active) {
          setPrograms(response.items)
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, 'Unable to load programs'))
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadPrograms()

    return () => {
      active = false
    }
  }, [])

  async function handleDelete(program: Program) {
    if (!window.confirm(`Delete program "${program.title}"? This will also delete its sessions.`)) {
      return
    }

    setDeletingId(program.id)
    setError(null)

    try {
      await programsApi.delete(program.id)
      setPrograms((current) => current.filter((item) => item.id !== program.id))
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete program'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programs"
        description="Create and manage tenant-scoped wellness programs."
        actions={
          <Link href="/programs/new" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            New program
          </Link>
        }
      />
      {error ? <ErrorAlert message={error} /> : null}
      {isLoading ? <LoadingState label="Loading programs..." /> : <ProgramList programs={programs} deletingId={deletingId} onDelete={handleDelete} />}
    </div>
  )
}
