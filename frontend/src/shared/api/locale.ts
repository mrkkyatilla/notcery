import type { components } from '@/shared/api/schema'

export type Locale = components['schemas']['Locale']

const LOCALE_STORAGE_KEY = 'notcery_locale'

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) return 'tr'
  const base = value.toLowerCase().split('-')[0]
  return base === 'en' ? 'en' : 'tr'
}

export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'tr'
  return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY))
}

export function setStoredLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}
