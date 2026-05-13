'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/components/auth/auth-provider'
import { ErrorAlert } from '@/components/shared/error-alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi, ApiError } from '@/lib/api/client'
import { signupFormSchema } from '@/lib/validation/auth'
import { getErrorMessage } from '@/lib/utils/error-message'

export function SignupForm() {
  const router = useRouter()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '', displayName: '', slug: '' })
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    const parsed = signupFormSchema.safeParse(form)
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await authApi.signup(parsed.data)
      login(response)
      router.replace('/programs')
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setFieldErrors(submitError.fieldErrors)
      }
      setError(getErrorMessage(submitError, 'Unable to create account'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create creator account</CardTitle>
        <CardDescription>Start your tenant workspace with a creator identity and a branded slug.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error ? <ErrorAlert message={error} /> : null}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" value={form.displayName} onChange={(event) => updateField('displayName', event.target.value)} />
            {fieldErrors.displayName?.[0] ? <p className="text-sm text-destructive">{fieldErrors.displayName[0]}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" value={form.slug} onChange={(event) => updateField('slug', event.target.value)} />
            {fieldErrors.slug?.[0] ? <p className="text-sm text-destructive">{fieldErrors.slug[0]}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
            {fieldErrors.email?.[0] ? <p className="text-sm text-destructive">{fieldErrors.email[0]}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} />
            {fieldErrors.password?.[0] ? <p className="text-sm text-destructive">{fieldErrors.password[0]}</p> : null}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
