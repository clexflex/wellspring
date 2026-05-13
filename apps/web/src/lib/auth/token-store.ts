const TOKEN_KEY = 'wellspring.auth.token'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getToken(): string | null {
  if (!canUseStorage()) {
    return null
  }

  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(TOKEN_KEY)
}
