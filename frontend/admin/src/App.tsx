import { Toaster } from 'sonner'

import { AdminPortalApp } from './app/AdminPortalApp'

export default function App() {
  return (
    <>
      <AdminPortalApp />
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
