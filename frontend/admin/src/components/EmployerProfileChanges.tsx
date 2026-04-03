import { formatDateTime } from '../lib/formatting'
import type { EmployerProfileChangeSummary } from '../types/admin'

function formatChangeValue(value: string | null) {
  if (!value || !value.trim()) return 'Blank'
  return value
}

export function EmployerProfileChanges({
  summary,
}: {
  summary: EmployerProfileChangeSummary | null | undefined
}) {
  if (!summary || summary.changes.length === 0) return null

  return (
    <section className="space-y-4 rounded-2xl border border-[#eadfce] bg-[#fcfaf6] p-5">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-950">
          Recent profile changes
        </h3>
        <p className="text-xs uppercase tracking-[0.14em] text-[#8da2c5]">
          Updated {formatDateTime(summary.changed_at)}
        </p>
      </div>
      <div className="space-y-3">
        {summary.changes.map((change) => (
          <div
            className="rounded-2xl border border-[#e4d8c5] bg-white px-4 py-3"
            key={change.field}
          >
            <p className="text-sm font-semibold text-slate-900">
              {`${change.label}: ${formatChangeValue(change.previous_value)} -> ${formatChangeValue(change.current_value)}`}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
