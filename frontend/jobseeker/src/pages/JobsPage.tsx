import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart } from 'lucide-react'

import { useAuth } from '@shared/auth/AuthProvider'

import { listVisibleJobs } from '../api/jobseekerApi'
import { JobCard } from '../components/JobCard'
import { JobseekerHeader } from '../components/JobseekerHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import {
  InlineNotice,
  PanelBody,
  PortalBadge,
  PortalButton,
  PortalPanel,
  Toggle,
} from '../components/ui/JobseekerUi'
import { announceComingSoon } from '../lib/comingSoon'
import type { JobListFilters, JobListItem } from '../types/jobseeker'

export function JobseekerJobsPage() {
  const auth = useAuth()
  const filterControlClassName =
    'h-12 rounded-2xl border border-[#ddd1be] bg-white px-4 text-sm font-medium text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/25'
  const filterActionClassName =
    'inline-flex h-12 items-center justify-center rounded-2xl border border-[#ddd1be] bg-white px-4 text-sm font-medium text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition hover:border-[#cfbeaa] hover:bg-[#faf7f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/25'
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<JobListItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchDraft, setSearchDraft] = useState('')
  const hasLoadedOnceRef = useRef(false)
  const [filters, setFilters] = useState<JobListFilters>({
    search: '',
    transit_required: '',
    is_eligible: undefined,
  })

  useEffect(() => {
    let active = true
    if (hasLoadedOnceRef.current) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)
    void listVisibleJobs(auth.requestTwa, { ...filters, page })
      .then((response) => {
        if (!active) return
        setItems(response.items)
        setTotalItems(response.meta.total_items)
        setTotalPages(response.meta.total_pages)
        hasLoadedOnceRef.current = true
      })
      .catch((nextError: Error) => {
        if (!active) return
        setError(nextError.message)
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      })

    return () => {
      active = false
    }
  }, [auth.requestTwa, filters, page])

  const eligibleCount = useMemo(
    () => items.filter((item) => item.is_eligible && !item.has_applied).length,
    [items]
  )

  function handleSearchSubmit() {
    setPage(1)
    setFilters((current) => ({
      ...current,
      search: searchDraft.trim(),
    }))
  }

  return (
    <div className="min-h-screen bg-[#f7f1e5]">
      <JobseekerHeader
        jobsSearch={{
          busy: isRefreshing,
          onChange: setSearchDraft,
          onSubmit: handleSearchSubmit,
          value: searchDraft,
        }}
      />

      <main className="mx-auto w-full max-w-[1260px] px-4 py-8 pb-12 sm:px-6">
        <section>
          <PortalPanel>
            <PanelBody className="space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:items-center">
                  <select
                    className={`${filterControlClassName} mt-0 w-full sm:w-[220px]`}
                    value={filters.transit_required ?? ''}
                    onChange={(event) => {
                      setPage(1)
                      setFilters((current) => ({
                        ...current,
                        transit_required: event.target
                          .value as JobListFilters['transit_required'],
                      }))
                    }}
                  >
                    <option value="">Any transit</option>
                    <option value="any">Transit friendly</option>
                    <option value="own_car">Own car required</option>
                  </select>

                  <div
                    className={`${filterControlClassName} flex w-full items-center justify-between gap-4 sm:w-[220px]`}
                  >
                    <span className="text-sm font-medium text-slate-700">
                      Eligible only
                    </span>
                    <Toggle
                      checked={Boolean(filters.is_eligible)}
                      size="compact"
                      onChange={(checked) => {
                        setPage(1)
                        setFilters((current) => ({
                          ...current,
                          is_eligible: checked ? true : undefined,
                        }))
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-row gap-3 lg:ml-auto lg:items-center lg:justify-end">
                  <button
                    aria-label="Saved jobs"
                    className={`${filterActionClassName} w-12 px-0`}
                    type="button"
                    onClick={() => announceComingSoon('Saved jobs')}
                  >
                    <Heart className="h-4 w-4" />
                  </button>

                  <PortalButton
                    className="h-12 rounded-2xl px-5 text-sm font-medium sm:w-[176px]"
                    variant="secondary"
                    onClick={() => {
                      setSearchDraft('')
                      setPage(1)
                      setFilters({
                        search: '',
                        transit_required: '',
                        is_eligible: undefined,
                      })
                    }}
                  >
                    Reset filters
                  </PortalButton>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <PortalBadge tone="info">
                  {totalItems} listings matching your filters
                </PortalBadge>
                {isRefreshing ? (
                  <PortalBadge className="gap-2" tone="info">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#aac0ea] border-t-[#3569c7]" />
                    Updating results
                  </PortalBadge>
                ) : null}
                {filters.is_eligible ? (
                  <PortalBadge tone="success">Eligible only</PortalBadge>
                ) : null}
                <PortalBadge tone="active">
                  {eligibleCount} ready to apply
                </PortalBadge>
              </div>
            </PanelBody>
          </PortalPanel>

          <div aria-busy={isLoading || isRefreshing} className="mt-8">
            {isLoading ? <LoadingState title="Loading open jobs..." /> : null}
            {!isLoading && error && items.length === 0 ? (
              <ErrorState title="Jobs unavailable" message={error} />
            ) : null}
            {!isLoading && error && items.length > 0 ? (
              <div className="mb-4">
                <InlineNotice tone="danger">{error}</InlineNotice>
              </div>
            ) : null}
            {!isLoading && !error && items.length === 0 ? (
              <EmptyState
                title="No open jobs matched this search"
                message="Try clearing one or two filters to widen the result set."
              />
            ) : null}
            {!isLoading && items.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <JobCard item={item} key={item.job.id} />
                ))}
              </div>
            ) : null}
          </div>

          {!isLoading && totalPages > 1 ? (
            <PortalPanel className="mt-8">
              <PanelBody className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex flex-wrap gap-3">
                  <PortalButton
                    disabled={page <= 1 || isRefreshing}
                    variant="secondary"
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Previous
                  </PortalButton>
                  <PortalButton
                    disabled={page >= totalPages || isRefreshing}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </PortalButton>
                </div>
              </PanelBody>
            </PortalPanel>
          ) : null}
        </section>
      </main>
    </div>
  )
}
