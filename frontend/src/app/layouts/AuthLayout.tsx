import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { LocaleThemeControls } from '@/features/settings/LocaleThemeControls'

export function AuthLayout() {
  const { t } = useTranslation('common')

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">{t('app.name')}</span>
        <div className="flex gap-2">
          <LocaleThemeControls layout="compact" />
        </div>
      </header>
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
        <Outlet />
      </main>
    </div>
  )
}
