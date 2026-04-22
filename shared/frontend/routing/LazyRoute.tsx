import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'

import { Card, CardBody } from '../ui/primitives'
import { RouteErrorBoundary } from './ErrorBoundary'

export function lazyNamedRoute<TModule extends Record<string, unknown>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule
) {
  return lazy(async () => {
    const module = await loader()
    const component = module[exportName]

    if (!component) {
      throw new Error(
        `Lazy route export "${String(exportName)}" was not found in the loaded module.`
      )
    }

    return {
      default: component as ComponentType,
    }
  })
}

/**
 * Wraps a lazy route in both a `Suspense` boundary (for code-splitting) and a
 * `RouteErrorBoundary` (for render-time crashes, including chunk-load
 * failures and errors thrown during Suspense fallback's resolution).
 *
 * The error boundary wraps the Suspense so that any error thrown while the
 * lazy chunk loads — or inside the resolved page — is contained. The boundary
 * auto-resets on pathname change, so navigating away from a broken page
 * restores normal rendering.
 */
export function RouteSuspense({
  children,
  message = 'Loading your workspace...',
}: {
  children: ReactNode
  message?: string
}) {
  return (
    <RouteErrorBoundary>
      <Suspense
        fallback={
          <div aria-live="polite" className="guard-shell" role="status">
            <Card>
              <CardBody>
                <p>{message}</p>
              </CardBody>
            </Card>
          </div>
        }
      >
        {children}
      </Suspense>
    </RouteErrorBoundary>
  )
}
