import { LoginForm } from '@/components/auth/login-form'
import { PublicOnly } from '@/components/auth/public-only'

export default function LoginPage() {
  return (
    <PublicOnly>
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <LoginForm />
      </div>
    </PublicOnly>
  )
}
