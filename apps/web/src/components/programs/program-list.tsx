'use client'

import Link from 'next/link'

import type { Program } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'

export function ProgramList({
  programs,
  deletingId,
  onDelete,
}: {
  programs: Program[]
  deletingId: string | null
  onDelete: (program: Program) => void
}) {
  if (programs.length === 0) {
    return <EmptyState title="No programs yet" description="Create your first program to start organizing sessions." />
  }

  return (
    <div className="grid gap-4">
      {programs.map((program) => (
        <Card key={program.id}>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>{program.title}</CardTitle>
                <CardDescription>{program.description || 'No description'}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/programs/${program.id}/sessions`} className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent">
                  Sessions
                </Link>
                <Link href={`/programs/${program.id}/edit`} className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent">
                  Edit
                </Link>
                <Button
                  variant="destructive"
                  disabled={deletingId === program.id}
                  onClick={() => onDelete(program)}
                >
                  {deletingId === program.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Updated {new Date(program.updatedAt).toLocaleString()}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
