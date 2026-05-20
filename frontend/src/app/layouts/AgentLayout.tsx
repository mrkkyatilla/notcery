import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/features/auth/auth-store'
import { LocaleThemeControls } from '@/features/settings/LocaleThemeControls'
import { WorkspaceSelector } from '@/features/workspace/WorkspaceSelector'
import { Button } from '@/shared/ui/button'

export function AgentLayout() {
  const { t } = useTranslation(['common', 'auth', 'lab'])
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="shrink-0 border-b">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="font-semibold">
              {t('common:app.name')}
            </Link>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm font-medium">{t('lab:navTitle')}</span>
            <nav className="ml-2 flex gap-2 text-sm">
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
                {t('common:nav.dashboard')}
              </Link>
              <Link to="/planner" className="text-muted-foreground hover:text-foreground">
                {t('common:nav.planner')}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <WorkspaceSelector />
            <LocaleThemeControls layout="compact" />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user?.display_name || user?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await logout()
                navigate('/login', { replace: true })
              }}
            >
              {t('auth:logout')}
            </Button>
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
