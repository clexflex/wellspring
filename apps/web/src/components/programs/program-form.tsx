'use client'

import Link from 'next/link'
import { useState } from 'react'

import { ErrorAlert } from '@/components/shared/error-alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'
import { programFormSchema } from '@/lib/validation/programs'
import { getErrorMessage } from '@/lib/utils/error-message'

export function ProgramForm({
  title,
  description,
  initialValues,
  submitLabel,
  cancelHref,
  onSubmit,
}: {
  title: string
  description: string
  initialValues?: { title: string; description: string }
  submitLabel: string
  cancelHref: string
  onSubmit: (values: { title: string; description: string }) => Promise<void>
}) {
  const [form, setForm] = useState({
    title: initialValues?.title ?? '',
    description: initialValues?.description ?? '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setError(null)

    const parsed = programFormSchema.safeParse(form)
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors)
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(parsed.data)
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setFieldErrors(submitError.fieldErrors)
      }
      setError(getErrorMessage(submitError, 'Unable to save program'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error ? <ErrorAlert message={error} /> : null}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
            {fieldErrors.title?.[0] ? <p className="text-sm text-destructive">{fieldErrors.title[0]}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
            {fieldErrors.description?.[0] ? <p className="text-sm text-destructive">{fieldErrors.description[0]}</p> : null}
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : submitLabel}
            </Button>
            <Link
              href={cancelHref}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
