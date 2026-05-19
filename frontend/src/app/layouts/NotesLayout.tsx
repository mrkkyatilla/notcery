import { Outlet } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/auth-store'
import { LocaleThemeControls } from '@/features/settings/LocaleThemeControls'
import { WorkspaceSelector } from '@/features/workspace/WorkspaceSelector'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/** Full-width shell for notes split view (no max-w constraint on main). */
export function NotesLayout() {
  const { t } = useTranslation('common')
  const user = useAuthStore((s) => s.user)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="font-semibold">
              {t('app.name')}
            </Link>
            <span className="text-sm text-muted-foreground">{t('nav.notes')}</span>
          </div>
          <div className="flex items-center gap-2">
            <WorkspaceSelector />
            <LocaleThemeControls layout="compact" />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user?.display_name || user?.email}
            </span>
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
