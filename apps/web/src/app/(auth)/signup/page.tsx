import { PublicOnly } from '@/components/auth/public-only'
import { SignupForm } from '@/components/auth/signup-form'

export default function SignupPage() {
  return (
    <PublicOnly>
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <SignupForm />
      </div>
    </PublicOnly>
  )
}
