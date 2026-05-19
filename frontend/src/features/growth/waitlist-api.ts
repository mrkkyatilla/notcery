import { parseApiError } from '@/shared/api/errors'
import { getStoredLocale } from '@/shared/api/locale'
import { getApiBaseUrl } from '@/shared/api/raw-request'

export type WaitlistPayload = {
  email: string
  locale?: string
}

export type WaitlistResult = {
  created: boolean
}

export async function joinWaitlist(payload: WaitlistPayload): Promise<WaitlistResult> {
  const locale = payload.locale ?? getStoredLocale()
  const response = await fetch(`${getApiBaseUrl()}/waitlist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': locale,
    },
    body: JSON.stringify({ email: payload.email, locale }),
  })

  if (response.status === 201) return { created: true }
  if (response.status === 200) return { created: false }
  throw await parseApiError(response)
}
