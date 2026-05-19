import { useThemeStore, type ResolvedTheme, type Theme } from '@/shared/theme/theme-store'

export function useTheme(): {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
} {
  const theme = useThemeStore((s) => s.theme)
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme)
  const setTheme = useThemeStore((s) => s.setTheme)
  return { theme, resolvedTheme, setTheme }
}
