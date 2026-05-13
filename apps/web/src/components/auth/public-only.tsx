'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/components/auth/auth-provider'
import { LoadingState } from '@/components/shared/loading-state'

export function PublicOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { status } = useAuth()

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/programs')
    }
  }, [router, status])

  if (status === 'loading') {
    return <LoadingState label="Checking your session..." />
  }

  if (status === 'authenticated') {
    return <LoadingState label="Redirecting..." />
  }

  return <>{children}</>
}
