import type { StoredSession } from './types'

export interface SessionStore {
  load(): StoredSession | null
  save(session: StoredSession): void
  clear(): void
}

export function createSessionStore(storageKey: string): SessionStore {
  return {
    load() {
      if (typeof window === 'undefined') return null
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return null
      try {
        const parsed = JSON.parse(raw) as StoredSession
        return parsed.accessToken && parsed.refreshToken ? parsed : null
      } catch {
        return null
      }
    },
    save(session) {
      if (typeof window === 'undefined') return
      window.localStorage.setItem(storageKey, JSON.stringify(session))
    },
    clear() {
      if (typeof window === 'undefined') return
      window.localStorage.removeItem(storageKey)
    },
  }
}
