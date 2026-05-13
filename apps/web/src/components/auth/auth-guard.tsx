'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/components/auth/auth-provider'
import { LoadingState } from '@/components/shared/loading-state'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { status } = useAuth()

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login')
    }
  }, [router, status])

  if (status !== 'authenticated') {
    return <LoadingState label="Checking your session..." />
  }

  return <>{children}</>
}
