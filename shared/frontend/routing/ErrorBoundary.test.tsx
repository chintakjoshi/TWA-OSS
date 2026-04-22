import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { ErrorBoundary, RouteErrorBoundary } from './ErrorBoundary'

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  // React logs every caught error to console.error in dev. Keep the test output
  // clean by silencing it; individual tests can read it through the spy.
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
})

function Boom({ message = 'kaboom' }: { message?: string }): ReactNode {
  throw new Error(message)
}

function EffectBoom({ message = 'effect kaboom' }: { message?: string }) {
  useEffect(() => {
    throw new Error(message)
  }, [message])
  return <div>will never be seen</div>
}

test('renders children when nothing throws', () => {
  render(
    <ErrorBoundary>
      <p>alive</p>
    </ErrorBoundary>
  )

  expect(screen.getByText('alive')).toBeInTheDocument()
})

test('renders a fallback UI when a child throws during render', () => {
  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>
  )

  expect(
    screen.getByRole('heading', { name: /something went wrong/i })
  ).toBeInTheDocument()
  // The fallback must not re-render the failing subtree.
  expect(screen.queryByText('alive')).not.toBeInTheDocument()
})

test('fallback exposes an assertive live region for assistive tech', () => {
  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>
  )

  const alert = screen.getByRole('alert')
  expect(alert).toHaveAttribute('aria-live', 'assertive')
})

test('catches errors thrown from effects inside children', () => {
  // React routes effect errors through componentDidCatch as well — make sure
  // the boundary handles this case since SSE handlers often throw in effects.
  render(
    <ErrorBoundary>
      <EffectBoom />
    </ErrorBoundary>
  )

  expect(
    screen.getByRole('heading', { name: /something went wrong/i })
  ).toBeInTheDocument()
})

test('invokes onError with the thrown error and component stack', () => {
  const onError = vi.fn()

  render(
    <ErrorBoundary onError={onError}>
      <Boom message="caught-by-onError" />
    </ErrorBoundary>
  )

  expect(onError).toHaveBeenCalledTimes(1)
  const [errorArg, infoArg] = onError.mock.calls[0]
  expect(errorArg).toBeInstanceOf(Error)
  expect((errorArg as Error).message).toBe('caught-by-onError')
  expect(infoArg).toHaveProperty('componentStack')
})

test('does not swallow errors thrown by onError handler', () => {
  // Logging infrastructure must never break rendering; if onError itself
  // throws, the boundary should still display the fallback.
  const onError = vi.fn(() => {
    throw new Error('logger blew up')
  })

  render(
    <ErrorBoundary onError={onError}>
      <Boom />
    </ErrorBoundary>
  )

  expect(
    screen.getByRole('heading', { name: /something went wrong/i })
  ).toBeInTheDocument()
})

test('custom fallback receives the error and a reset callback', async () => {
  const user = userEvent.setup()

  function HealingChild() {
    const [broken, setBroken] = useState(true)
    if (broken) {
      throw new Error('transient')
    }
    return (
      <button type="button" onClick={() => setBroken(true)}>
        healed
      </button>
    )
  }

  let resetCount = 0

  render(
    <ErrorBoundary
      fallback={(error, reset) => (
        <div>
          <p>custom: {error.message}</p>
          <button
            type="button"
            onClick={() => {
              resetCount += 1
              reset()
            }}
          >
            retry
          </button>
        </div>
      )}
    >
      <HealingChild />
    </ErrorBoundary>
  )

  expect(screen.getByText('custom: transient')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'retry' }))
  expect(resetCount).toBe(1)
  // HealingChild re-mounts with broken=true default, so we still see the
  // fallback — but reset must have been called at least once.
  expect(screen.getByText('custom: transient')).toBeInTheDocument()
})

test('default fallback exposes a retry button that clears the error', async () => {
  const user = userEvent.setup()

  function Flaky({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) throw new Error('flaky')
    return <p>recovered</p>
  }

  function Host() {
    const [shouldThrow, setShouldThrow] = useState(true)
    return (
      <>
        <button type="button" onClick={() => setShouldThrow(false)}>
          fix-it
        </button>
        <ErrorBoundary>
          <Flaky shouldThrow={shouldThrow} />
        </ErrorBoundary>
      </>
    )
  }

  render(<Host />)

  expect(
    screen.getByRole('heading', { name: /something went wrong/i })
  ).toBeInTheDocument()

  // Fix the underlying issue first so the retry can succeed.
  await user.click(screen.getByRole('button', { name: 'fix-it' }))
  await user.click(screen.getByRole('button', { name: /try again/i }))

  expect(screen.getByText('recovered')).toBeInTheDocument()
  expect(
    screen.queryByRole('heading', { name: /something went wrong/i })
  ).not.toBeInTheDocument()
})

test('resetKeys changing clears the captured error automatically', () => {
  function Flaky({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) throw new Error('key-reset')
    return <p>recovered-via-key</p>
  }

  function Host({
    shouldThrow,
    routeKey,
  }: {
    shouldThrow: boolean
    routeKey: string
  }) {
    return (
      <ErrorBoundary resetKeys={[routeKey]}>
        <Flaky shouldThrow={shouldThrow} />
      </ErrorBoundary>
    )
  }

  const { rerender } = render(<Host shouldThrow routeKey="/a" />)
  expect(
    screen.getByRole('heading', { name: /something went wrong/i })
  ).toBeInTheDocument()

  // Changing the resetKey (e.g. new route) while the child also stops
  // throwing should clear the fallback.
  rerender(<Host shouldThrow={false} routeKey="/b" />)
  expect(screen.getByText('recovered-via-key')).toBeInTheDocument()
})

test('RouteErrorBoundary resets when the pathname changes', async () => {
  function HomePage() {
    throw new Error('home exploded')
  }

  function OtherPage() {
    return <p>other page</p>
  }

  render(
    <MemoryRouter initialEntries={['/']}>
      <nav>
        <Link to="/other">go-other</Link>
      </nav>
      <RouteErrorBoundary>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/other" element={<OtherPage />} />
        </Routes>
      </RouteErrorBoundary>
    </MemoryRouter>
  )

  expect(
    screen.getByRole('heading', { name: /something went wrong/i })
  ).toBeInTheDocument()

  const user = userEvent.setup()
  await user.click(screen.getByRole('link', { name: 'go-other' }))

  expect(screen.getByText('other page')).toBeInTheDocument()
  expect(
    screen.queryByRole('heading', { name: /something went wrong/i })
  ).not.toBeInTheDocument()
})
