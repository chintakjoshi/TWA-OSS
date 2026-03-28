import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'

import { createEmployerListing } from '../api/employerApi'
import { EmployerHeader } from '../components/EmployerHeader'
import { ListingForm } from '../components/ListingForm'
import {
  InlineNotice,
  Modal,
  PortalButton,
  PortalPanel,
} from '../components/ui/EmployerUi'
import type { ListingFormValues } from '../types/employer'

export function EmployerNewListingPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingValues, setPendingValues] = useState<ListingFormValues | null>(
    null
  )

  const reviewStatus = auth.authMe?.employer_review_status ?? 'pending'
  const blocked = reviewStatus !== 'approved'

  async function submit(values: ListingFormValues) {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await createEmployerListing(auth.requestTwa, values)
      navigate(`/my-listings/${response.listing.id}`)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to submit the listing right now.'
      )
    } finally {
      setIsSubmitting(false)
      setPendingValues(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f1e5]">
      <EmployerHeader />
      <main className="mx-auto max-w-[980px] space-y-8 px-4 py-8 lg:px-8">
        <PortalPanel>
          <div className="space-y-6 px-6 py-6">
            <div>
              <h1 className="employer-display text-[2.4rem] leading-[1.02] font-semibold text-slate-950">
                Submit a job listing
              </h1>
              <p className="mt-3 text-base leading-8 text-slate-500">
                Each listing is reviewed by TWA staff before it goes live. Most
                reviews are completed within one business day.
              </p>
            </div>

            {blocked ? (
              <InlineNotice
                tone={reviewStatus === 'rejected' ? 'danger' : 'info'}
              >
                {reviewStatus === 'rejected'
                  ? 'Your employer account is not approved right now, so listing submission stays locked until staff reassesses the account.'
                  : 'Your employer account is still pending review. Finish your profile and wait for staff approval before posting listings.'}
              </InlineNotice>
            ) : null}

            {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

            {blocked ? (
              <div className="flex flex-wrap gap-3">
                <Link to="/dashboard">
                  <PortalButton variant="secondary">
                    Back to dashboard
                  </PortalButton>
                </Link>
                <Link to="/profile">
                  <PortalButton variant="ghost">
                    Review employer profile
                  </PortalButton>
                </Link>
              </div>
            ) : (
              <ListingForm
                isSubmitting={isSubmitting}
                onSubmit={async (values) => {
                  setPendingValues(values)
                }}
              />
            )}
          </div>
        </PortalPanel>
      </main>

      <Modal
        open={pendingValues !== null}
        title="Submit listing for review?"
        onClose={() => setPendingValues(null)}
      >
        <div className="space-y-6">
          <p className="text-sm leading-7 text-slate-600">
            Your listing will be sent to TWA staff for review. You will receive
            an email notification when it is approved or if changes are needed.
            Most reviews are completed within one business day.
          </p>
          <div className="rounded-2xl border border-[#eadfce] bg-[#fcfaf6] px-4 py-3 font-medium text-slate-700">
            {pendingValues?.title || 'New listing'}
          </div>
          <div className="flex justify-end gap-3">
            <PortalButton
              disabled={isSubmitting}
              variant="secondary"
              onClick={() => setPendingValues(null)}
            >
              Cancel
            </PortalButton>
            <PortalButton
              disabled={isSubmitting}
              onClick={() => {
                if (!pendingValues) return
                void submit(pendingValues)
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
            </PortalButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
