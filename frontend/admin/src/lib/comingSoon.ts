import { toast } from 'sonner'

export function announceComingSoon(feature: string) {
  toast.info(`${feature} is coming soon.`, {
    description:
      'This action is available in the new staff UI, but the backend workflow is not connected yet.',
  })
}
