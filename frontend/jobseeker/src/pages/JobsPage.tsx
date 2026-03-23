import { useEffect, useMemo, useState } from 'react'
import {
  BriefcaseBusiness,
  Bus,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'

import { useAuth } from '@shared/auth/AuthProvider'

import { listVisibleJobs } from '../api/jobseekerApi'
import { JobCard } from '../components/JobCard'
import { JobseekerHeader } from '../components/JobseekerHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import {
  PanelBody,
  PortalBadge,
  PortalButton,
  PortalPanel,
  StatCard,
  Toggle,
  inputClassName,
} from '../components/ui/JobseekerUi'
import { announceComingSoon } from '../lib/comingSoon'
import type { JobListFilters, JobListItem } from '../types/jobseeker'

export function JobseekerJobsPage() {
  const auth = useAuth()
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<JobListItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchDraft, setSearchDraft] = useState('')
  const [cityDraft, setCityDraft] = useState('')
  const [filters, setFilters] = useState<JobListFilters>({
    search: '',
    city: '',
    transit_required: '',
    is_eligible: undefined,
  })

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    void listVisibleJobs(auth.requestTwa, { ...filters, page })
      .then((response) => {
        if (!active) return
        setItems(response.items)
        setTotalItems(response.meta.total_items)
        setTotalPages(response.meta.total_pages)
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
  }, [auth, filters, page])

  const eligibleCount = useMemo(
    () => items.filter((item) => item.is_eligible).length,
    [items]
  )
  const transitAccessibleCount = useMemo(
    () => items.filter((item) => item.job.transit_accessible).length,
    [items]
  )

  return (
    <div className="min-h-screen bg-[#f7f1e5]">
      <JobseekerHeader />

      <main className="pb-12">
        <section className="bg-[#132130] text-white">
          <div className="mx-auto flex w-full max-w-[1260px] flex-col gap-8 px-4 py-10 sm:px-6">
            <div className="max-w-[720px]">
              <h1 className="jobseeker-display text-[clamp(2.9rem,6vw,4.5rem)] leading-[0.95] font-semibold">
                Find your next opportunity
              </h1>
              <p className="mt-4 text-lg leading-8 text-[#cfdbeb]">
                Browse active TWA listings, see profile-based fit at a glance,
                and open the detail view before you apply.
              </p>
            </div>

            <form
              className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]"
              onSubmit={(event) => {
                event.preventDefault()
                setPage(1)
                setFilters((current) => ({
                  ...current,
                  search: searchDraft.trim(),
                  city: cityDraft.trim(),
                }))
              }}
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7b93b8]" />
                <input
                  className="min-h-14 w-full rounded-2xl border border-white/10 bg-white/12 pl-12 pr-4 text-base text-white outline-none transition placeholder:text-[#8fa5c8] focus:border-[#d0922c] focus:ring-4 focus:ring-[#d0922c]/20"
                  placeholder="Search by role, city, or keyword..."
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                />
              </div>
              <PortalButton
                className="bg-white text-[#132130] hover:bg-[#f5e5c8]"
                type="submit"
              >
                Search
              </PortalButton>
            </form>

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                accent="#d0922c"
                hint="Active listings in this result set"
                icon={BriefcaseBusiness}
                label="Open Listings"
                value={String(totalItems)}
              />
              <StatCard
                accent="#2f7d4b"
                hint="Listings you can apply to on this page"
                icon={Sparkles}
                label="Eligible on This Page"
                value={String(eligibleCount)}
              />
              <StatCard
                accent="#3569c7"
                hint="Listings marked transit accessible"
                icon={Bus}
                label="Transit Accessible"
                value={String(transitAccessibleCount)}
              />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1260px] px-4 py-8 sm:px-6">
          <PortalPanel>
            <PanelBody className="space-y-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                    Filter jobs
                  </p>
                  <h2 className="jobseeker-display text-[1.8rem] font-semibold text-slate-950">
                    Refine the listings you see
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#ddd1be] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#cfbeaa] hover:bg-[#faf7f1]"
                    type="button"
                    onClick={() => announceComingSoon('Industry filter')}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    All industries
                  </button>
                  <button
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#ddd1be] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#cfbeaa] hover:bg-[#faf7f1]"
                    type="button"
                    onClick={() => announceComingSoon('Saved jobs')}
                  >
                    Saved jobs
                  </button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                    City
                  </label>
                  <input
                    className={inputClassName}
                    placeholder="Filter by city"
                    value={cityDraft}
                    onChange={(event) => setCityDraft(event.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                    Transit requirement
                  </label>
                  <select
                    className={inputClassName}
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
                </div>
                <div className="flex items-end">
                  <div className="flex min-h-12 w-full items-center justify-between rounded-xl border border-[#ddd1be] bg-white px-4">
                    <span className="text-sm font-medium text-slate-700">
                      Eligible only
                    </span>
                    <Toggle
                      checked={Boolean(filters.is_eligible)}
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
                <div className="flex items-end">
                  <PortalButton
                    className="w-full"
                    variant="secondary"
                    onClick={() => {
                      setSearchDraft('')
                      setCityDraft('')
                      setPage(1)
                      setFilters({
                        search: '',
                        city: '',
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
                {filters.is_eligible ? (
                  <PortalBadge tone="success">Eligible only</PortalBadge>
                ) : null}
              </div>
            </PanelBody>
          </PortalPanel>

          <div className="mt-8">
            {isLoading ? <LoadingState title="Loading open jobs..." /> : null}
            {!isLoading && error ? (
              <ErrorState title="Jobs unavailable" message={error} />
            ) : null}
            {!isLoading && !error && items.length === 0 ? (
              <EmptyState
                title="No open jobs matched this search"
                message="Try clearing one or two filters to widen the result set."
              />
            ) : null}
            {!isLoading && !error && items.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <JobCard item={item} key={item.job.id} />
                ))}
              </div>
            ) : null}
          </div>

          {!isLoading && !error && totalPages > 1 ? (
            <PortalPanel className="mt-8">
              <PanelBody className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex flex-wrap gap-3">
                  <PortalButton
                    disabled={page <= 1}
                    variant="secondary"
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Previous
                  </PortalButton>
                  <PortalButton
                    disabled={page >= totalPages}
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
