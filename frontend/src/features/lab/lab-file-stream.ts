import { getAccessToken } from '@/features/auth/token-storage'

import { getApiBaseUrl } from '@/shared/api/client'
import { getStoredLocale } from '@/shared/api/locale'

export async function fetchLabFileBlob(fileId: string, signal?: AbortSignal): Promise<Blob> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    'Accept-Language': getStoredLocale(),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${getApiBaseUrl()}/lab/files/${fileId}/stream`, {
    headers,
    signal,
  })
  if (!response.ok) {
    throw new Error(`Failed to load file (${response.status})`)
  }
  return response.blob()
}
