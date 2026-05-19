import { getStoredLocale, type Locale } from '@/shared/api/locale'

import { parseApiError } from './errors'

const DEFAULT_API_URL = 'http://localhost:8000/api/v1'

export function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL
  return url.replace(/\/$/, '')
}

export type RawRequestOptions = {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  locale?: Locale
  token?: string | null
  signal?: AbortSignal
}

export async function rawApiRequest<T>(
  path: string,
  options: RawRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Accept-Language': options.locale ?? getStoredLocale(),
    ...options.headers,
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
