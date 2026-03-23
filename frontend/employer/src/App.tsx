import { Toaster } from 'sonner'

import { EmployerPortalApp } from './app/EmployerPortalApp'

export default function App() {
  return (
    <>
      <EmployerPortalApp />
      <Toaster
        position="bottom-right"
        richColors
        toastOptions={{
          style: {
            borderRadius: '18px',
            border: '1px solid #223246',
          },
        }}
      />
    </>
  )
}
