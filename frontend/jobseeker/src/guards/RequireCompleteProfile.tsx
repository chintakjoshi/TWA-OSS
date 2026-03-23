import { Navigate } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'

import { LoadingPanel } from '../components/ui/JobseekerUi'

export function RequireCompleteProfile({
  children,
}: {
  children: React.ReactElement
}) {
  const auth = useAuth()

  if (auth.state === 'loading') {
    return (
      <div className="mx-auto w-full max-w-[1260px] px-4 py-8 sm:px-6">
        <LoadingPanel
          message="Confirming that your TWA profile is ready for the jobseeker routes."
          title="Checking your profile status..."
        />
      </div>
    )
  }

  if (!auth.authMe?.profile_complete) {
    return <Navigate replace to="/profile" />
  }

  return children
}
