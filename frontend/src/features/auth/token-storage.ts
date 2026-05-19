import type { TokenPair } from '@/features/auth/types'

const REFRESH_KEY = 'notcery_refresh'

let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(REFRESH_KEY)
}

export function setTokens(tokens: TokenPair): void {
  accessToken = tokens.access
  sessionStorage.setItem(REFRESH_KEY, tokens.refresh)
}

export function clearTokens(): void {
  accessToken = null
  sessionStorage.removeItem(REFRESH_KEY)
}
