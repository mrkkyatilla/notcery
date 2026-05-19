import { create } from 'zustand'

import type { components } from '@/shared/api/schema'

export type Theme = components['schemas']['Theme']
export type ResolvedTheme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'notcery_theme'

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyDomTheme(theme: Theme): ResolvedTheme {
  const resolved = resolveTheme(theme)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  if (!reduceMotion) {
    document.documentElement.classList.add('theme-transition')
    window.setTimeout(() => {
      document.documentElement.classList.remove('theme-transition')
    }, 200)
  }
  return resolved
}

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

export function setStoredTheme(theme: Theme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

type SetThemeOptions = {
  syncStorage?: boolean
  skipPersist?: boolean
}

type ThemeState = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme, options?: SetThemeOptions) => void
  hydrate: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: (theme, options = {}) => {
    if (options.syncStorage !== false) {
      setStoredTheme(theme)
    }
    const resolvedTheme = applyDomTheme(theme)
    set({ theme, resolvedTheme })
  },
  hydrate: () => {
    const theme = getStoredTheme()
    const resolvedTheme = applyDomTheme(theme)
    set({ theme, resolvedTheme })
  },
}))
