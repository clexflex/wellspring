'use client'

import { useMemo, useState } from 'react'

import { ErrorAlert } from '@/components/shared/error-alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { importsApi } from '@/lib/api/client'
import type { BulkImportResult } from '@/lib/api/types'
import { SESSION_IMPORT_CSV_EXAMPLE } from '@/lib/imports/csv-example'
import { getErrorMessage } from '@/lib/utils/error-message'

function createIdempotencyKey() {
  return crypto.randomUUID()
}

export function SessionImportForm({ programId }: { programId: string }) {
  const [clientImportId, setClientImportId] = useState(createIdempotencyKey)
  const [csv, setCsv] = useState(SESSION_IMPORT_CSV_EXAMPLE)
  const [result, setResult] = useState<BulkImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const example = useMemo(() => SESSION_IMPORT_CSV_EXAMPLE, [])

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setCsv(await file.text())
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await importsApi.importSessions(programId, { clientImportId, csv })
      setResult(response)
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to import sessions'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Import sessions from CSV</CardTitle>
          <CardDescription>Bulk import sessions with row-level validation feedback and tenant-scoped idempotency.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error ? <ErrorAlert message={error} /> : null}
            <div className="space-y-2">
              <Label htmlFor="clientImportId">Idempotency key</Label>
              <div className="flex flex-col gap-3 md:flex-row">
                <Input
                  id="clientImportId"
                  value={clientImportId}
                  onChange={(event) => setClientImportId(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setClientImportId(createIdempotencyKey())}
                >
                  Generate new key
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Reusing the same key will replay the previous import instead of creating duplicate
                sessions. Generate a new key only when you want a new import.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="csvFile">CSV file</Label>
              <Input id="csvFile" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="csv">CSV contents</Label>
              <Textarea id="csv" className="min-h-[320px] font-mono text-xs" value={csv} onChange={(event) => setCsv(event.target.value)} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Importing...' : 'Import sessions'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CSV example</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">{example}</pre>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>Import result</CardTitle>
            <CardDescription>
              Status: {result.import.status} | Inserted: {result.import.insertedCount} | Failed:{' '}
              {result.import.failedCount}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.import.replayed ? (
              <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                This import was replayed from the existing idempotency key. No duplicate sessions
                were created.
              </div>
            ) : null}
            <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
              <p>Created at: {new Date(result.import.createdAt).toLocaleString()}</p>
              <p>Completed at: {new Date(result.import.completedAt).toLocaleString()}</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Session ID</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row) => (
                  <TableRow key={`${row.rowNumber}-${row.status}`}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell className="font-mono text-xs">{row.sessionId ?? '—'}</TableCell>
                    <TableCell>{row.errors.length > 0 ? row.errors.join(', ') : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
