import { Link } from 'react-router-dom'

import { Badge, Card, CardBody } from '@shared/ui/primitives'

import type { JobListItem } from '../types/jobseeker'

function formatTransitLabel(value: 'own_car' | 'any'): string {
  return value === 'own_car' ? 'Own car required' : 'Any transit option'
}

export function JobCard({ item }: { item: JobListItem }) {
  return (
    <Card strong className="job-card">
      <CardBody className="stack-md">
        <div
          className="cluster job-card-heading"
          style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
        >
          <div className="stack-sm">
            <h2 className="card-title">{item.job.title}</h2>
            <p className="card-copy">
              {item.job.city ?? 'City not set'}
              {item.job.zip ? `, ${item.job.zip}` : ''}
            </p>
          </div>
          <Badge tone={item.is_eligible ? 'success' : 'warning'}>
            {item.is_eligible
              ? 'Eligible'
              : (item.ineligibility_tag ?? 'Not eligible')}
          </Badge>
        </div>
        <p className="card-copy">
          {item.job.description ?? 'No description added yet.'}
        </p>
        <div className="cluster">
          <Badge tone="info">
            {formatTransitLabel(item.job.transit_required)}
          </Badge>
          <Badge tone={item.job.transit_accessible ? 'success' : 'neutral'}>
            {item.job.transit_accessible
              ? 'Transit accessible'
              : 'Transit unknown'}
          </Badge>
        </div>
        <Link className="button button-secondary" to={`/jobs/${item.job.id}`}>
          View details
        </Link>
      </CardBody>
    </Card>
  )
}
