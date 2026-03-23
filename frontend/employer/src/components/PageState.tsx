import { EmptyPanel, ErrorPanel, LoadingPanel } from './ui/EmployerUi'

export function LoadingState({
  title,
  message,
}: {
  title: string
  message?: string
}) {
  return <LoadingPanel message={message} title={title} />
}

export function ErrorState({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return <ErrorPanel message={message} title={title} />
}

export function EmptyState({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return <EmptyPanel message={message} title={title} />
}
