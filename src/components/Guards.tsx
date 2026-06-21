import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './ui'

/** Requires any signed-in session (child after PIN, or a parent). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner label="Loading…" />
  if (!user) return <Navigate to="/" replace />
  return <>{children}</>
}

/** Requires a parent (email/password) session. */
export function RequireParent({ children }: { children: ReactNode }) {
  const { role, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner label="Loading…" />
  if (role !== 'parent') {
    return <Navigate to="/parent/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
