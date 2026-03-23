import { toast } from 'sonner'

export function announceComingSoon(feature: string) {
  toast.info('Feature coming soon', {
    description: `${feature} is not available yet in the current employer API workflow.`,
  })
}
