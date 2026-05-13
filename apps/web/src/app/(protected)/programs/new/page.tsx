'use client'

import { useRouter } from 'next/navigation'

import { PageHeader } from '@/components/shared/page-header'
import { ProgramForm } from '@/components/programs/program-form'
import { programsApi } from '@/lib/api/client'

export default function NewProgramPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <PageHeader title="Create program" description="Add a new program for this creator workspace." />
      <ProgramForm
        title="Program details"
        description="Set a title and short description for the program."
        submitLabel="Create program"
        cancelHref="/programs"
        onSubmit={async (values) => {
          const response = await programsApi.create(values)
          router.replace(`/programs/${response.program.id}/sessions`)
        }}
      />
    </div>
  )
}
