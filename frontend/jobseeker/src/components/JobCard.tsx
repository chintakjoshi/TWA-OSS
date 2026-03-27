import { Link } from 'react-router-dom'
import { Heart, MapPin, Navigation, ShieldCheck } from 'lucide-react'

import { announceComingSoon } from '../lib/comingSoon'
import type { JobListItem } from '../types/jobseeker'
import { PanelBody, PortalBadge, PortalPanel } from './ui/JobseekerUi'

function formatTransitLabel(value: 'own_car' | 'any'): string {
  return value === 'own_car' ? 'Own car required' : 'Any transit option'
}

export function JobCard({ item }: { item: JobListItem }) {
  const statusTone = item.has_applied
    ? 'info'
    : item.is_eligible
      ? 'success'
      : 'warning'
  const statusLabel = item.has_applied
    ? 'Already applied'
    : item.is_eligible
      ? 'Eligible'
      : (item.ineligibility_tag ?? 'Not eligible')

  return (
    <PortalPanel className="h-full">
      <PanelBody className="flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#e6dac7] bg-[#f9f4eb] text-lg font-semibold text-[#132130]">
              {item.job.title.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 space-y-1">
              <h2 className="jobseeker-display break-words text-[1.7rem] leading-none font-semibold text-slate-950">
                {item.job.title}
              </h2>
              <p className="text-sm text-slate-500">
                {item.job.city ?? 'City not set'}
                {item.job.zip ? `, ${item.job.zip}` : ''}
              </p>
            </div>
          </div>
          <PortalBadge
            className="shrink-0 self-start whitespace-nowrap"
            tone={statusTone}
          >
            {statusLabel}
          </PortalBadge>
        </div>

        <p className="line-clamp-3 text-sm leading-7 text-slate-600">
          {item.job.description ?? 'No description added yet.'}
        </p>

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f6f2ea] px-3 py-1.5 text-slate-700">
            <MapPin className="h-4 w-4 text-[#d0922c]" />
            {item.job.city ?? 'Location pending'}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f6f2ea] px-3 py-1.5 text-slate-700">
            <Navigation className="h-4 w-4 text-[#2458b8]" />
            {formatTransitLabel(item.job.transit_required)}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f6f2ea] px-3 py-1.5 text-slate-700">
            <ShieldCheck className="h-4 w-4 text-[#2f7d4b]" />
            {item.job.transit_accessible
              ? 'Transit accessible'
              : 'Transit info pending'}
          </span>
        </div>

        <div className="mt-auto flex items-center gap-3">
          <button
            aria-label={`Save ${item.job.title}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#ddd1be] bg-white text-slate-600 transition hover:border-[#cfbeaa] hover:bg-[#faf7f1]"
            type="button"
            onClick={() => announceComingSoon('Saved jobs')}
          >
            <Heart className="h-4 w-4" />
          </button>
          <Link
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[#d0922c] bg-[#d0922c] px-4 text-sm font-semibold text-white transition hover:border-[#b67a1b] hover:bg-[#b67a1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60"
            to={`/jobs/${item.job.id}`}
          >
            {item.has_applied ? 'Review Listing' : 'Review & Apply'}
          </Link>
        </div>
      </PanelBody>
    </PortalPanel>
  )
}
