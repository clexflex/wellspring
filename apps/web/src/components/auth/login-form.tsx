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
import { loginFormSchema } from '@/lib/validation/auth'
import { getErrorMessage } from '@/lib/utils/error-message'

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    const parsed = loginFormSchema.safeParse({ email, password })
    if (!parsed.success) {
      const nextFieldErrors = parsed.error.flatten().fieldErrors
      setFieldErrors(nextFieldErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await authApi.login(parsed.data)
      login(response)
      router.replace('/programs')
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setFieldErrors(submitError.fieldErrors)
      }
      setError(getErrorMessage(submitError, 'Unable to log in'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Use your Wellspring creator credentials to manage programs and sessions.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error ? <ErrorAlert message={error} /> : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            {fieldErrors.email?.[0] ? <p className="text-sm text-destructive">{fieldErrors.email[0]}</p> : null}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            {fieldErrors.password?.[0] ? <p className="text-sm text-destructive">{fieldErrors.password[0]}</p> : null}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Need an account?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
