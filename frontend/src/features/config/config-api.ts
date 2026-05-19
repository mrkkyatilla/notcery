import type { components } from '@/shared/api/schema'
import { rawApiRequest } from '@/shared/api/raw-request'

export type PublicConfig = components['schemas']['PublicConfig']

const PUBLIC_CONFIG_KEY = 'public_config'
const PUBLIC_CONFIG_TTL_MS = 5 * 60 * 1000

type CachedConfig = {
  fetchedAt: number
  data: PublicConfig
}

export async function fetchPublicConfig(): Promise<PublicConfig> {
  const cached = readCachedPublicConfig()
  if (cached) return cached

  const data = await rawApiRequest<PublicConfig>('/config/public')
  sessionStorage.setItem(
    PUBLIC_CONFIG_KEY,
    JSON.stringify({ fetchedAt: Date.now(), data } satisfies CachedConfig),
  )
  return data
}

function readCachedPublicConfig(): PublicConfig | null {
  try {
    const raw = sessionStorage.getItem(PUBLIC_CONFIG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedConfig
    if (Date.now() - parsed.fetchedAt > PUBLIC_CONFIG_TTL_MS) {
      sessionStorage.removeItem(PUBLIC_CONFIG_KEY)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}
