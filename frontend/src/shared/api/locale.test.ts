import { beforeEach, describe, expect, it } from 'vitest'

import { getStoredLocale, normalizeLocale, setStoredLocale } from '@/shared/api/locale'

describe('locale', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('normalizes browser locales', () => {
    expect(normalizeLocale('en-US')).toBe('en')
    expect(normalizeLocale('tr-TR')).toBe('tr')
    expect(normalizeLocale('de')).toBe('tr')
  })

  it('persists locale in localStorage', () => {
    setStoredLocale('en')
    expect(getStoredLocale()).toBe('en')
  })
})
