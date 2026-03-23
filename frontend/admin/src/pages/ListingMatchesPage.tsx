import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '@shared/auth/AuthProvider'

import { getMatchesForListing, listListings } from '../api/adminApi'
import { AdminWorkspaceLayout } from '../components/layout/AdminWorkspaceLayout'
import {
  AdminPanel,
  InlineNotice,
  PanelBody,
  PanelHeader,
  StatusBadge,
  TableCell,
  TableHeadRow,
  TableWrap,
  DataTable,
  inputClassName,
} from '../components/ui/AdminUi'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import { describeMatchReason } from '../lib/formatting'
import type { JobListing, JobseekerMatchItem } from '../types/admin'

export function AdminListingMatchesPage() {
  const auth = useAuth()
  const [listings, setListings] = useState<JobListing[]>([])
  const [selectedListingId, setSelectedListingId] = useState('')
  const [matches, setMatches] = useState<JobseekerMatchItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMatchesLoading, setIsMatchesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    void listListings(auth.requestTwa, { page: 1, pageSize: 100 })
      .then((response) => {
        if (!active) return
        setListings(response.items)
        if (response.items[0]) setSelectedListingId(response.items[0].id)
      })
      .catch((nextError: Error) => {
        if (!active) return
        setError(nextError.message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [auth.requestTwa])

  useEffect(() => {
    if (!selectedListingId) return
    let active = true
    setIsMatchesLoading(true)
    void getMatchesForListing(auth.requestTwa, selectedListingId)
      .then((response) => {
        if (!active) return
        setMatches(response.items)
      })
      .catch((nextError: Error) => {
        if (!active) return
        setError(nextError.message)
      })
      .finally(() => {
        if (active) setIsMatchesLoading(false)
      })

    return () => {
      active = false
    }
  }, [auth.requestTwa, selectedListingId])

  const selectedListing = useMemo(
    () => listings.find((listing) => listing.id === selectedListingId) ?? null,
    [listings, selectedListingId]
  )

  return (
    <AdminWorkspaceLayout title="Match by Listing">
      <div className="space-y-6">
        {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

        {isLoading ? <LoadingState title="Loading listings..." /> : null}
        {!isLoading && error && listings.length === 0 ? (
          <ErrorState title="Match inputs unavailable" message={error} />
        ) : null}

        {!isLoading ? (
          <>
            <AdminPanel>
              <PanelHeader title="Select Job Listing" />
              <PanelBody>
                <select
                  className={inputClassName}
                  value={selectedListingId}
                  onChange={(event) => setSelectedListingId(event.target.value)}
                >
                  {listings.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.title} -{' '}
                      {listing.employer?.org_name ?? 'Employer'}
                    </option>
                  ))}
                </select>
              </PanelBody>
            </AdminPanel>

            <AdminPanel>
              <PanelHeader
                subtitle="Candidate rows reflect the backend eligibility response."
                title={`Candidate Matches for ${selectedListing?.title ?? 'Selected Listing'}`}
              />
              <PanelBody className="p-0">
                {isMatchesLoading ? (
                  <div className="px-6 py-8">
                    <LoadingState title="Running listing match..." />
                  </div>
                ) : matches.length === 0 ? (
                  <div className="px-6 py-8">
                    <EmptyState
                      title="No results yet"
                      message="Choose a listing to load matching candidates."
                    />
                  </div>
                ) : (
                  <TableWrap>
                    <DataTable>
                      <thead>
                        <TableHeadRow>
                          <TableCell header>Jobseeker</TableCell>
                          <TableCell header>City</TableCell>
                          <TableCell header>Eligibility</TableCell>
                          <TableCell header>Reasons</TableCell>
                        </TableHeadRow>
                      </thead>
                      <tbody>
                        {matches.map((item) => (
                          <tr key={item.jobseeker.id}>
                            <TableCell className="font-semibold text-slate-950">
                              {item.jobseeker.full_name ?? item.jobseeker.id}
                            </TableCell>
                            <TableCell>
                              {item.jobseeker.city ?? 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                tone={item.is_eligible ? 'success' : 'danger'}
                              >
                                {item.is_eligible ? 'Eligible' : 'Ineligible'}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>
                              {item.is_eligible
                                ? 'Matches current criteria.'
                                : item.ineligibility_reasons
                                    .map(describeMatchReason)
                                    .join(' · ')}
                            </TableCell>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                  </TableWrap>
                )}
              </PanelBody>
            </AdminPanel>
          </>
        ) : null}
      </div>
    </AdminWorkspaceLayout>
  )
}
