'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { ErrorAlert } from '@/components/shared/error-alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi, ApiError } from '@/lib/api/client'
import { resetPasswordFormSchema } from '@/lib/validation/auth'
import { getErrorMessage } from '@/lib/utils/error-message'

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialToken = useMemo(() => searchParams.get('token') ?? '', [searchParams])
  const [token, setToken] = useState(initialToken)
  const [newPassword, setNewPassword] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSuccessMessage(null)
    setError(null)
    setFieldErrors({})

    const parsed = resetPasswordFormSchema.safeParse({ token, newPassword })
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors)
      return
    }

    setIsSubmitting(true)

    try {
      await authApi.confirmPasswordReset(parsed.data)
      setSuccessMessage('Password updated. Redirecting to login...')
      window.setTimeout(() => {
        router.replace('/login')
      }, 1000)
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setFieldErrors(submitError.fieldErrors)
      }
      setError(getErrorMessage(submitError, 'Unable to reset password'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Paste the reset token or open this page from the development reset URL.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error ? <ErrorAlert message={error} /> : null}
          {successMessage ? <div className="rounded-md border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">{successMessage}</div> : null}
          <div className="space-y-2">
            <Label htmlFor="token">Reset token</Label>
            <Input id="token" value={token} onChange={(event) => setToken(event.target.value)} />
            {fieldErrors.token?.[0] ? <p className="text-sm text-destructive">{fieldErrors.token[0]}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            {fieldErrors.newPassword?.[0] ? <p className="text-sm text-destructive">{fieldErrors.newPassword[0]}</p> : null}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Updating password...' : 'Update password'}
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
