import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/utils'

const links = [
  { to: '/settings/profile', key: 'profile' },
  { to: '/settings/billing', key: 'billing' },
  { to: '/settings/account', key: 'account' },
] as const

export function SettingsLayout() {
  const { t } = useTranslation('settings')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('nav.subtitle')}</p>
      </div>
      <nav className="flex flex-wrap gap-2 border-b pb-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            {t(`nav.${link.key}`)}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
