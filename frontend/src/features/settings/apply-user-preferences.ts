import type { User } from '@/features/auth/types'
import { changeAppLanguage } from '@/shared/i18n'
import { useThemeStore } from '@/shared/theme/theme-store'

export function applyUserPreferences(user: User): void {
  changeAppLanguage(user.locale)
  useThemeStore.getState().setTheme(user.theme, { syncStorage: true })
}
