import { Alert, Card, CardBody } from '@shared/ui/primitives'

export function LoadingState({ title }: { title: string }) {
  return <Card strong><CardBody><p>{title}</p></CardBody></Card>
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <Card strong>
      <CardBody className="stack-sm">
        <h2 className="card-title">{title}</h2>
        <p className="card-copy">{message}</p>
      </CardBody>
    </Card>
  )
}

export function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <Card strong>
      <CardBody className="stack-md">
        <h2 className="card-title">{title}</h2>
        <Alert tone="danger"><p>{message}</p></Alert>
      </CardBody>
    </Card>
  )
}
