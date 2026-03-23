import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
  PanelBody,
  PortalPanel,
} from './ui/JobseekerUi'

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
  return (
    <PortalPanel>
      <PanelBody>
        <EmptyPanel title={title} message={message} />
      </PanelBody>
    </PortalPanel>
  )
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
