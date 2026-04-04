import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'

import { Card, CardBody } from '../ui/primitives'

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

export function RouteSuspense({
  children,
  message = 'Loading your workspace...',
}: {
  children: ReactNode
  message?: string
}) {
  return (
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
  )
}
