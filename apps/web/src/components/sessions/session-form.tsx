'use client'

import Link from 'next/link'
import { useState } from 'react'

import { ErrorAlert } from '@/components/shared/error-alert'
import { MediaUploadField } from '@/components/sessions/media-upload-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'
import type { Session } from '@/lib/api/types'
import { normalizeTags, sessionFormSchema } from '@/lib/validation/sessions'
import { getErrorMessage } from '@/lib/utils/error-message'

type SessionFormState = {
  title: string
  description: string
  durationSeconds: string
  instructorName: string
  tagsText: string
  mediaUrl: string
  mediaType: '' | 'audio' | 'video'
}

function getInitialState(initialSession?: Session): SessionFormState {
  return {
    title: initialSession?.title ?? '',
    description: initialSession?.description ?? '',
    durationSeconds: initialSession?.durationSeconds ? String(initialSession.durationSeconds) : '',
    instructorName: initialSession?.instructorName ?? '',
    tagsText: initialSession?.tags.join(', ') ?? '',
    mediaUrl: initialSession?.mediaUrl ?? '',
    mediaType: initialSession?.mediaType ?? '',
  }
}

export function SessionForm({
  title,
  description,
  initialSession,
  submitLabel,
  cancelHref,
  mode,
  onSubmit,
}: {
  title: string
  description: string
  initialSession?: Session
  submitLabel: string
  cancelHref: string
  mode: 'create' | 'edit'
  onSubmit: (payload: {
    title?: string
    description?: string
    durationSeconds?: number | null
    instructorName?: string | null
    tags?: string[]
    mediaUrl?: string | null
    mediaType?: 'audio' | 'video' | null
  }) => Promise<void>
}) {
  const [form, setForm] = useState<SessionFormState>(() => getInitialState(initialSession))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field: keyof SessionFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setError(null)

    const parsed = sessionFormSchema.safeParse(form)
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors)
      return
    }

    const values = parsed.data
    const payload = {
      title: values.title,
      description: values.description,
      durationSeconds: mode === 'create' ? values.durationSeconds : (values.durationSeconds ?? null),
      instructorName: mode === 'create' ? (values.instructorName?.trim() || undefined) : (values.instructorName?.trim() || null),
      tags: normalizeTags(values.tagsText),
      mediaUrl: mode === 'create' ? values.mediaUrl : (values.mediaUrl ?? null),
      mediaType: values.mediaType === '' ? (mode === 'create' ? undefined : null) : values.mediaType,
    }

    setIsSubmitting(true)

    try {
      await onSubmit(payload)
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setFieldErrors(submitError.fieldErrors)
      }
      setError(getErrorMessage(submitError, 'Unable to save session'))
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(event) => updateField('title', event.target.value)} />
              {fieldErrors.title?.[0] ? <p className="text-sm text-destructive">{fieldErrors.title[0]}</p> : null}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(event) => updateField('description', event.target.value)} />
              {fieldErrors.description?.[0] ? <p className="text-sm text-destructive">{fieldErrors.description[0]}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationSeconds">Duration in seconds</Label>
              <Input id="durationSeconds" value={form.durationSeconds} onChange={(event) => updateField('durationSeconds', event.target.value)} />
              {fieldErrors.durationSeconds?.[0] ? <p className="text-sm text-destructive">{fieldErrors.durationSeconds[0]}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructorName">Instructor name</Label>
              <Input id="instructorName" value={form.instructorName} onChange={(event) => updateField('instructorName', event.target.value)} />
              {fieldErrors.instructorName?.[0] ? <p className="text-sm text-destructive">{fieldErrors.instructorName[0]}</p> : null}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tagsText">Tags</Label>
              <Input id="tagsText" value={form.tagsText} onChange={(event) => updateField('tagsText', event.target.value)} placeholder="sleep, intro, breathwork" />
              <p className="text-xs text-muted-foreground">Enter tags as comma-separated values.</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="mediaUrl">Media URL</Label>
              <Input id="mediaUrl" value={form.mediaUrl} onChange={(event) => updateField('mediaUrl', event.target.value)} />
              {fieldErrors.mediaUrl?.[0] ? <p className="text-sm text-destructive">{fieldErrors.mediaUrl[0]}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mediaType">Media type</Label>
              <Select id="mediaType" value={form.mediaType} onChange={(event) => updateField('mediaType', event.target.value as SessionFormState['mediaType'])}>
                <option value="">No media type</option>
                <option value="audio">Audio</option>
                <option value="video">Video</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <MediaUploadField
                onUploaded={({ mediaUrl, mediaType }) => {
                  setForm((current) => ({
                    ...current,
                    mediaUrl,
                    mediaType,
                  }))
                }}
              />
            </div>
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
