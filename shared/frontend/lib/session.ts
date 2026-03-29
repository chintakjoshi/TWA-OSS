import type { StoredSession } from './types'

export interface SessionStore {
  load(): StoredSession | null
  save(session: StoredSession): void
  clear(): void
}

const inMemorySessions = new Map<string, StoredSession>()

export function createSessionStore(storageKey: string): SessionStore {
  return {
    load() {
      if (typeof window === 'undefined') return null
      return inMemorySessions.get(storageKey) ?? null
    },
    save(session) {
      if (typeof window === 'undefined') return
      inMemorySessions.set(storageKey, session)
    },
    clear() {
      if (typeof window === 'undefined') return
      inMemorySessions.delete(storageKey)
    },
  }
}
