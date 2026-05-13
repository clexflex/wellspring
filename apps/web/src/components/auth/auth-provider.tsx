'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { authApi } from '@/lib/api/client'
import type { AuthResponse, Creator } from '@/lib/api/types'
import { subscribeToAuthInvalidated } from '@/lib/auth/auth-events'
import { clearToken, getToken, setToken } from '@/lib/auth/token-store'

type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

type AuthContextValue = {
  status: AuthStatus
  creator: Creator | null
  isAuthenticated: boolean
  login: (response: AuthResponse) => void
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchCurrentCreator(): Promise<Creator | null> {
  const token = getToken()

  if (!token) {
    return null
  }

  const response = await authApi.me()
  return response.creator
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [creator, setCreator] = useState<Creator | null>(null)

  const logout = useCallback(() => {
    clearToken()
    setCreator(null)
    setStatus('anonymous')
  }, [])

  const refresh = useCallback(async () => {
    setStatus('loading')

    try {
      const nextCreator = await fetchCurrentCreator()

      if (nextCreator) {
        setCreator(nextCreator)
        setStatus('authenticated')
      } else {
        setCreator(null)
        setStatus('anonymous')
      }
    } catch {
      logout()
    }
  }, [logout])

  const login = useCallback((response: AuthResponse) => {
    setToken(response.token)
    setCreator(response.creator)
    setStatus('authenticated')
  }, [])

  useEffect(() => {
    let active = true

    async function bootstrapAuth() {
      try {
        const nextCreator = await fetchCurrentCreator()

        if (!active) {
          return
        }

        if (nextCreator) {
          setCreator(nextCreator)
          setStatus('authenticated')
        } else {
          setCreator(null)
          setStatus('anonymous')
        }
      } catch {
        if (active) {
          logout()
        }
      }
    }

    void bootstrapAuth()

    return () => {
      active = false
    }
  }, [logout])

  useEffect(() => subscribeToAuthInvalidated(logout), [logout])

  const value = useMemo(
    () => ({
      status,
      creator,
      isAuthenticated: status === 'authenticated',
      login,
      logout,
      refresh,
    }),
    [creator, login, logout, refresh, status]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
