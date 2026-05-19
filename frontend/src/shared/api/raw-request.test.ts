import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setStoredLocale } from '@/shared/api/locale'
import { rawApiRequest } from '@/shared/api/raw-request'

describe('rawApiRequest', () => {
  beforeEach(() => {
    setStoredLocale('en')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends Accept-Language from stored locale', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await rawApiRequest('/health')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers['Accept-Language']).toBe('en')
  })

  it('allows explicit locale override', async () => {
    setStoredLocale('tr')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await rawApiRequest('/health', { locale: 'en' })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers['Accept-Language']).toBe('en')
  })
})
