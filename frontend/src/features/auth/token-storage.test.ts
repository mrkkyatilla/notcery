import { beforeEach, describe, expect, it } from 'vitest'

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/features/auth/token-storage'

describe('token-storage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearTokens()
  })

  it('stores access in memory and refresh in sessionStorage', () => {
    setTokens({
      access: 'access-1',
      refresh: 'refresh-1',
      access_expires_in: 900,
    })

    expect(getAccessToken()).toBe('access-1')
    expect(getRefreshToken()).toBe('refresh-1')
  })

  it('clears tokens', () => {
    setTokens({
      access: 'a',
      refresh: 'r',
      access_expires_in: 900,
    })
    clearTokens()
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })
})
