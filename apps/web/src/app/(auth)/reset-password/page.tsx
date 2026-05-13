import { PublicOnly } from '@/components/auth/public-only'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <PublicOnly>
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <ResetPasswordForm />
      </div>
    </PublicOnly>
  )
}
