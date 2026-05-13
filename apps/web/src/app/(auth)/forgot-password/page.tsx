import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { PublicOnly } from '@/components/auth/public-only'

export default function ForgotPasswordPage() {
  return (
    <PublicOnly>
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <ForgotPasswordForm />
      </div>
    </PublicOnly>
  )
}
