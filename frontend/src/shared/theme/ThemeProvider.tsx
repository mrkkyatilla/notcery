import { useLayoutEffect, type ReactNode } from 'react'

import { useThemeStore } from '@/shared/theme/theme-store'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const hydrate = useThemeStore((s) => s.hydrate)

  useLayoutEffect(() => {
    hydrate()

    const theme = useThemeStore.getState().theme
    if (theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => useThemeStore.getState().setTheme('system')

    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [hydrate])

  return children
}
