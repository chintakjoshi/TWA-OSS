import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { useAuth } from '@shared/auth/AuthProvider'

import { getDashboard } from '../../api/adminApi'
import type { AdminDashboard } from '../../types/admin'

type AdminShellContextValue = {
  summary: AdminDashboard | null
  summaryLoading: boolean
  refreshSummary: () => Promise<void>
}

const AdminShellContext = createContext<AdminShellContextValue | null>(null)

export function AdminShellProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const [summary, setSummary] = useState<AdminDashboard | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const refreshSummary = useCallback(async () => {
    if (
      auth.state !== 'authenticated' ||
      auth.authMe?.app_user?.app_role !== 'staff'
    ) {
      setSummary(null)
      setSummaryLoading(false)
      return
    }

    setSummaryLoading(true)
    try {
      const nextSummary = await getDashboard(auth.requestTwa)
      setSummary(nextSummary)
    } catch {
      setSummary(null)
    } finally {
      setSummaryLoading(false)
    }
  }, [auth])

  useEffect(() => {
    void refreshSummary()
  }, [refreshSummary])

  const value = useMemo(
    () => ({ summary, summaryLoading, refreshSummary }),
    [refreshSummary, summary, summaryLoading]
  )

  return (
    <AdminShellContext.Provider value={value}>
      {children}
    </AdminShellContext.Provider>
  )
}

export function useAdminShell() {
  const context = useContext(AdminShellContext)
  if (!context) {
    throw new Error('useAdminShell must be used within an AdminShellProvider.')
  }
  return context
}
