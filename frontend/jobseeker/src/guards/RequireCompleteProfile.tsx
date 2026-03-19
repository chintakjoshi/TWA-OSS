import { Navigate } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { Card, CardBody } from '@shared/ui/primitives'

export function RequireCompleteProfile({ children }: { children: React.ReactElement }) {
  const auth = useAuth()

  if (auth.state === 'loading') {
    return (
      <div className="page-frame">
        <Card strong>
          <CardBody><p>Checking your profile status...</p></CardBody>
        </Card>
      </div>
    )
  }

  if (!auth.authMe?.profile_complete) {
    return <Navigate replace to="/profile" />
  }

  return children
}
