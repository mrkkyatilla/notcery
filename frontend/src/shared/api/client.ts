import { useAuthStore } from '@/features/auth/auth-store'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/features/auth/token-storage'
import type { TokenPair } from '@/features/auth/types'

import type { Locale } from '@/shared/api/locale'
import { rawApiRequest } from '@/shared/api/raw-request'
import { showApiError } from '@/shared/api/show-api-error'

import { ApiError } from './errors'

let refreshPromise: Promise<boolean> | null = null

export { getApiBaseUrl } from '@/shared/api/raw-request'

export type ApiRequestOptions = {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  locale?: Locale
  token?: string | null
  signal?: AbortSignal
  auth?: boolean
  _retried?: boolean
  toastOnError?: boolean
}

async function tryRefreshSession(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false

  if (!refreshPromise) {
    refreshPromise = rawApiRequest<TokenPair>('/auth/refresh', {
      method: 'POST',
      body: { refresh },
    })
      .then((tokens) => {
        setTokens(tokens)
        return true
      })
      .catch(() => {
        useAuthStore.getState().clearSession()
        clearTokens()
        return false
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const useAuth = options.auth !== false
  const token = options.token ?? (useAuth ? getAccessToken() : null)

  try {
    return await rawApiRequest<T>(path, {
      method: options.method,
      body: options.body,
      headers: options.headers,
      locale: options.locale,
      token,
      signal: options.signal,
    })
  } catch (error) {
    if (
      useAuth &&
      !options._retried &&
      error instanceof ApiError &&
      error.status === 401 &&
      !path.startsWith('/auth/')
    ) {
      const refreshed = await tryRefreshSession()
      if (refreshed) {
        return apiRequest<T>(path, { ...options, _retried: true })
      }
    }

    if (options.toastOnError) {
      showApiError(error)
    }
    throw error
  }
}

export { ApiError }
