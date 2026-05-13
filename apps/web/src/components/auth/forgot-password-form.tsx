'use client'

import Link from 'next/link'
import { useState } from 'react'

import { ErrorAlert } from '@/components/shared/error-alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi, ApiError } from '@/lib/api/client'
import { forgotPasswordFormSchema } from '@/lib/validation/auth'
import { getErrorMessage } from '@/lib/utils/error-message'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSuccessMessage(null)
    setDebugResetUrl(null)
    setError(null)
    setFieldErrors({})

    const parsed = forgotPasswordFormSchema.safeParse({ email })
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await authApi.requestPasswordReset(parsed.data)
      setSuccessMessage('If the email exists, a password reset has been prepared.')
      setDebugResetUrl(response.debug?.resetUrl ?? null)
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setFieldErrors(submitError.fieldErrors)
      }
      setError(getErrorMessage(submitError, 'Unable to request password reset'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Request a reset token for your creator account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error ? <ErrorAlert message={error} /> : null}
          {successMessage ? <div className="rounded-md border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">{successMessage}</div> : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            {fieldErrors.email?.[0] ? <p className="text-sm text-destructive">{fieldErrors.email[0]}</p> : null}
          </div>
          {debugResetUrl ? (
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              <p className="font-medium">Development reset URL</p>
              <a href={debugResetUrl} className="break-all text-primary hover:underline">
                {debugResetUrl}
              </a>
            </div>
          ) : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Requesting reset...' : 'Request reset'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Return to{' '}
          <Link href="/login" className="text-primary hover:underline">
            log in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
