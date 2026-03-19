export interface ErrorPayload {
  detail?: string
  code?: string
  [key: string]: unknown
}

export class HttpError extends Error {
  status: number
  code?: string
  payload?: ErrorPayload

  constructor(status: number, message: string, payload?: ErrorPayload) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = typeof payload?.code === 'string' ? payload.code : undefined
    this.payload = payload
  }
}

export function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

export async function requestJson<T>(input: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')

  const response = await fetch(input, { ...init, headers })
  const isJson = response.headers.get('content-type')?.includes('application/json') ?? false
  const payload = isJson ? ((await response.json()) as ErrorPayload) : undefined

  if (!response.ok) {
    const detail = typeof payload?.detail === 'string' ? payload.detail : `Request failed with status ${response.status}`
    throw new HttpError(response.status, detail, payload)
  }

  return (payload ?? (undefined as T)) as T
}
