import { Toaster } from 'sonner'

import { JobseekerApp } from './app/JobseekerApp'

export default function App() {
  return (
    <>
      <JobseekerApp />
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
