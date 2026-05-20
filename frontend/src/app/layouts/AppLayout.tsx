import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/features/auth/auth-store'
import { usePublicConfig } from '@/features/config/use-public-config'
import { BillingUsageChips } from '@/features/billing/BillingUsageChips'
import { LocaleThemeControls } from '@/features/settings/LocaleThemeControls'
import { WorkspaceSelector } from '@/features/workspace/WorkspaceSelector'
import { useWorkspaceStore } from '@/features/workspace/workspace-store'
import { Button } from '@/shared/ui/button'

export function AppLayout() {
  const { t } = useTranslation(['common', 'auth'])
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const { data: publicConfig } = usePublicConfig()
  const labEnabled = publicConfig?.lab_enabled !== false

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="font-semibold">
              {t('common:app.name')}
            </Link>
            <nav className="flex gap-2 text-sm">
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
                {t('common:nav.dashboard')}
              </Link>
              <Link to="/planner" className="text-muted-foreground hover:text-foreground">
                {t('common:nav.planner')}
              </Link>
              {workspaceId ? (
                <>
                  <Link
                    to={`/w/${workspaceId}/notes`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t('common:nav.notes')}
                  </Link>
                  <Link
                    to={`/w/${workspaceId}/library`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t('common:nav.library')}
                  </Link>
                  {labEnabled ? (
                    <Link
                      to={`/w/${workspaceId}/lab`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {t('common:nav.lab')}
                    </Link>
                  ) : null}
                </>
              ) : null}
              <Link
                to="/settings/profile"
                className="text-muted-foreground hover:text-foreground"
              >
                {t('common:nav.settings')}
              </Link>
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BillingUsageChips />
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
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
