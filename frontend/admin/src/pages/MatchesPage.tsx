import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '@shared/auth/AuthProvider'

import { getMatchesForJobseeker, listJobseekers } from '../api/adminApi'
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
import type { JobseekerListItem, ListingMatchItem } from '../types/admin'

export function AdminMatchesPage() {
  const auth = useAuth()
  const [jobseekers, setJobseekers] = useState<JobseekerListItem[]>([])
  const [selectedJobseekerId, setSelectedJobseekerId] = useState('')
  const [matches, setMatches] = useState<ListingMatchItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMatchesLoading, setIsMatchesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    void listJobseekers(auth.requestTwa, { page: 1, pageSize: 100 })
      .then((response) => {
        if (!active) return
        setJobseekers(response.items)
        if (response.items[0]) setSelectedJobseekerId(response.items[0].id)
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
    if (!selectedJobseekerId) return
    let active = true
    setIsMatchesLoading(true)
    void getMatchesForJobseeker(auth.requestTwa, selectedJobseekerId)
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
  }, [auth.requestTwa, selectedJobseekerId])

  const selectedJobseeker = useMemo(
    () =>
      jobseekers.find((jobseeker) => jobseeker.id === selectedJobseekerId) ??
      null,
    [jobseekers, selectedJobseekerId]
  )

  return (
    <AdminWorkspaceLayout title="Match by Jobseeker">
      <div className="space-y-6">
        {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

        {isLoading ? <LoadingState title="Loading jobseekers..." /> : null}
        {!isLoading && error && jobseekers.length === 0 ? (
          <ErrorState title="Match inputs unavailable" message={error} />
        ) : null}

        {!isLoading ? (
          <>
            <AdminPanel>
              <PanelHeader title="Select Jobseeker" />
              <PanelBody>
                <select
                  className={inputClassName}
                  value={selectedJobseekerId}
                  onChange={(event) =>
                    setSelectedJobseekerId(event.target.value)
                  }
                >
                  {jobseekers.map((jobseeker) => (
                    <option key={jobseeker.id} value={jobseeker.id}>
                      {jobseeker.full_name ?? jobseeker.id}
                      {jobseeker.city ? ` (${jobseeker.city})` : ''}
                    </option>
                  ))}
                </select>
              </PanelBody>
            </AdminPanel>

            <AdminPanel>
              <PanelHeader
                subtitle="Eligibility is based on the current matching engine results."
                title={`Matching Results for ${selectedJobseeker?.full_name ?? 'Selected Jobseeker'}`}
              />
              <PanelBody className="p-0">
                {isMatchesLoading ? (
                  <div className="px-6 py-8">
                    <LoadingState title="Running job match..." />
                  </div>
                ) : matches.length === 0 ? (
                  <div className="px-6 py-8">
                    <EmptyState
                      title="No results yet"
                      message="Choose a jobseeker to load matching job listings."
                    />
                  </div>
                ) : (
                  <TableWrap>
                    <DataTable>
                      <thead>
                        <TableHeadRow>
                          <TableCell header>Title</TableCell>
                          <TableCell header>Location</TableCell>
                          <TableCell header>Eligibility</TableCell>
                          <TableCell header>Notes</TableCell>
                        </TableHeadRow>
                      </thead>
                      <tbody>
                        {matches.map((item) => (
                          <tr key={item.job.id}>
                            <TableCell className="font-semibold text-slate-950">
                              {item.job.title}
                            </TableCell>
                            <TableCell>{item.job.city ?? 'Unknown'}</TableCell>
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
                                    .concat(
                                      item.ineligibility_tag
                                        ? [item.ineligibility_tag]
                                        : []
                                    )
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
