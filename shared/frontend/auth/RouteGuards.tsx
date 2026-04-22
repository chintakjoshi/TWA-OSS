import { Navigate, useLocation } from 'react-router-dom'

import type { AppRole } from '../lib/types'
import { Card, CardBody } from '../ui/primitives'
import { useAuth } from './AuthProvider'

function LoadingCard({ message }: { message: string }) {
  return (
    <div className="guard-shell">
      <Card>
        <CardBody>
          <p>{message}</p>
        </CardBody>
      </Card>
    </div>
  )
}

export function RequireRole({
  role,
  children,
}: {
  role: AppRole
  children: React.ReactElement
}) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.state === 'loading')
    return <LoadingCard message="Loading your workspace..." />
  if (auth.state === 'anonymous' || auth.state === 'otp_required')
    return <Navigate replace to="/auth" state={{ from: location.pathname }} />
  if (!auth.authMe?.app_user)
    return <Navigate replace to="/auth" state={{ from: location.pathname }} />
  if (auth.authMe.app_user.app_role !== role)
    return <Navigate replace to="/auth" state={{ from: location.pathname }} />

  return children
}
