import { useEffect, type ReactNode } from 'react'

import { useAuthStore } from '@/features/auth/auth-store'
import { useWorkspaceStore } from '@/features/workspace/workspace-store'
import { setSentryUser } from '@/shared/observability/sentry'

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const hydrateAuth = useAuthStore((s) => s.hydrate)
  const hydrateWorkspace = useWorkspaceStore((s) => s.hydrate)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    void hydrateAuth()
    hydrateWorkspace()
  }, [hydrateAuth, hydrateWorkspace])

  useEffect(() => {
    if (!user?.id) {
      setSentryUser(null)
      return
    }
    setSentryUser({
      id: user.id,
      locale: user.locale,
      theme: user.theme,
    })
  }, [user?.id, user?.locale, user?.theme])

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        …
      </div>
    )
  }

  return children
}
