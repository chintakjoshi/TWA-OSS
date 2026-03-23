import { EmptyPanel, ErrorPanel, LoadingPanel } from './ui/AdminUi'

export function LoadingState({ title }: { title: string }) {
  return <LoadingPanel title={title} />
}

export function EmptyState({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return <EmptyPanel title={title} message={message} />
}

export function ErrorState({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return <ErrorPanel title={title} message={message} />
}
