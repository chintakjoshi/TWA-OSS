import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import { Button, Card, CardBody } from '../ui/primitives'

/**
 * Render prop for callers who need a custom fallback.
 * `reset` clears the captured error so the children are re-mounted.
 */
export type ErrorBoundaryFallback = (
  error: Error,
  reset: () => void
) => ReactNode

export type ErrorBoundaryProps = {
  children: ReactNode
  /**
   * Called with the captured error and React's component stack. Useful for
   * forwarding errors to observability infrastructure. Throwing from this
   * callback is tolerated — the fallback is still rendered.
   */
  onError?: (error: Error, info: ErrorInfo) => void
  /**
   * Custom fallback renderer. When omitted, a generic accessible fallback
   * card is shown with a "Try again" button.
   */
  fallback?: ErrorBoundaryFallback
  /**
   * When any value in this array changes between renders, a captured error is
   * cleared automatically. Use this to reset the boundary on navigation
   * (route key), query identity changes, etc.
   */
  resetKeys?: ReadonlyArray<unknown>
}

type ErrorBoundaryState = {
  error: Error | null
}

function shallowArrayEqual(
  a: ReadonlyArray<unknown> | undefined,
  b: ReadonlyArray<unknown> | undefined
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (!Object.is(a[i], b[i])) return false
  }
  return true
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value
  try {
    return new Error(typeof value === 'string' ? value : JSON.stringify(value))
  } catch {
    return new Error('Unknown error')
  }
}

/**
 * Generic React error boundary. Catches errors thrown during rendering, in
 * lifecycle methods, and in constructors of the component tree below it.
 *
 * Notes:
 * - React error boundaries do NOT catch errors in event handlers, async code,
 *   or server-side rendering. SSE/fetch handlers must surface failures into
 *   render state (e.g. `setError(err)` followed by `throw`) to be caught here.
 * - Keep this component as a class component: React only recognises error
 *   boundaries via `getDerivedStateFromError` / `componentDidCatch`.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    const { onError } = this.props
    if (!onError) return
    try {
      onError(toError(error), info)
    } catch (loggingError) {
      // A broken logger must never break the fallback. Surface the failure in
      // dev consoles but keep going.
      console.error(
        '[ErrorBoundary] onError handler threw; continuing.',
        loggingError
      )
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (
      this.state.error !== null &&
      !shallowArrayEqual(prevProps.resetKeys, this.props.resetKeys)
    ) {
      this.reset()
    }
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (error === null) return this.props.children

    const { fallback } = this.props
    if (fallback) return fallback(error, this.reset)

    return <DefaultErrorFallback error={error} onReset={this.reset} />
  }
}

function DefaultErrorFallback({
  error,
  onReset,
}: {
  error: Error
  onReset: () => void
}) {
  // Only reveal raw error messages when running locally. In production, a
  // generic notice avoids leaking internals to end users.
  const isDev = import.meta.env?.DEV === true
  const detail = isDev
    ? error.message || 'Unexpected error'
    : 'Please try again. If the issue persists, contact support.'

  return (
    <div
      aria-live="assertive"
      className="guard-shell"
      data-testid="error-boundary-fallback"
      role="alert"
    >
      <Card strong>
        <CardBody className="stack-md">
          <p className="eyebrow">Something Broke</p>
          <h1 className="card-title">Something went wrong</h1>
          <p className="card-copy">{detail}</p>
          <div className="cluster">
            <Button onClick={onReset} tone="primary">
              Try again
            </Button>
            <Button
              onClick={() => {
                window.location.reload()
              }}
              tone="ghost"
            >
              Reload page
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

/**
 * Route-aware error boundary: resets its captured error whenever the router
 * pathname changes, so a user navigating away from a broken page sees the
 * next page instead of a sticky fallback.
 *
 * Must be rendered inside a React Router `<Router>` context.
 */
export function RouteErrorBoundary({
  children,
  onError,
  fallback,
}: {
  children: ReactNode
  onError?: ErrorBoundaryProps['onError']
  fallback?: ErrorBoundaryFallback
}) {
  const location = useLocation()
  return (
    <ErrorBoundary
      fallback={fallback}
      onError={onError}
      resetKeys={[location.pathname]}
    >
      {children}
    </ErrorBoundary>
  )
}
