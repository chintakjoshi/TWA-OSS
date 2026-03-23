import { toast } from 'sonner'

export function announceComingSoon(feature: string) {
  toast.info(`${feature} is coming soon.`, {
    description:
      'This part of the jobseeker experience is in the new frontend, but the workflow is not connected yet.',
  })
}
