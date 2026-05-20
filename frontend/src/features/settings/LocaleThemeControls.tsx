import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/features/auth/auth-store'
import { usePublicConfig } from '@/features/config/use-public-config'
import { useDebouncedProfilePatch } from '@/features/settings/preferences-api'
import type { Locale } from '@/shared/api/locale'
import { changeAppLanguage } from '@/shared/i18n'
import type { Theme } from '@/shared/theme/theme-store'
import { useTheme } from '@/shared/theme/use-theme'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Select } from '@/shared/ui/select'

type Props = {
  layout?: 'compact' | 'form'
}

export function LocaleThemeControls({ layout = 'compact' }: Props) {
  const { t, i18n } = useTranslation(['settings', 'common'])
  const { data: publicConfig } = usePublicConfig()
  const user = useAuthStore((s) => s.user)
  const { theme, resolvedTheme, setTheme } = useTheme()
  const patchProfile = useDebouncedProfilePatch()

  const handleLocale = (locale: Locale) => {
    changeAppLanguage(locale)
    if (user) patchProfile({ locale })
  }

  const handleTheme = (next: Theme) => {
    setTheme(next)
    if (user) patchProfile({ theme: next })
  }

  if (layout === 'compact') {
    const nextLocale: Locale = i18n.language.startsWith('en') ? 'tr' : 'en'
    return (
      <>
        <Button
          variant="outline"
          size="icon"
          aria-label={t('common:actions.toggleLanguage')}
          onClick={() => handleLocale(nextLocale)}
        >
          {nextLocale.toUpperCase()}
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={t('common:actions.toggleTheme')}
          onClick={() => handleTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
        </Button>
      </>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="locale">{t('settings:profile.locale')}</Label>
        <Select
          id="locale"
          value={i18n.language.startsWith('en') ? 'en' : 'tr'}
          onChange={(e) => handleLocale(e.target.value as Locale)}
        >
          {publicConfig?.locales.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="theme">{t('settings:profile.theme')}</Label>
        <Select
          id="theme"
          value={theme}
          onChange={(e) => handleTheme(e.target.value as Theme)}
        >
          {publicConfig?.themes.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}
