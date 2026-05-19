import type { ReactNode } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'

import { usePublicConfig } from '@/features/config/use-public-config'
import { Skeleton } from '@/shared/ui/skeleton'

export function PublicConfigProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = usePublicConfig()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center text-sm text-destructive">
        Failed to load app configuration.
      </div>
    )
  }

  const clientId = data.google_oauth.client_id || 'not-configured'

  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
}
