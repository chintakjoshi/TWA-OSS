export function resolveAuthBaseUrl(rawValue?: string): string {
  const trimmed = rawValue?.trim()
  if (!trimmed) return '/_auth'

  const normalized = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed

  // Older local setups used `/auth`, but the frontends proxy authSDK through
  // `/_auth`. Remap the deprecated relative value so auth and admin requests
  // both resolve through the dev proxy.
  if (normalized === '/auth') return '/_auth'

  return normalized
}
