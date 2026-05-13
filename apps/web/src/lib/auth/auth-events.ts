const AUTH_INVALIDATED_EVENT = 'wellspring:auth-invalidated'

export function emitAuthInvalidated(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(AUTH_INVALIDATED_EVENT))
}

export function subscribeToAuthInvalidated(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const handler = () => callback()
  window.addEventListener(AUTH_INVALIDATED_EVENT, handler)

  return () => {
    window.removeEventListener(AUTH_INVALIDATED_EVENT, handler)
  }
}
