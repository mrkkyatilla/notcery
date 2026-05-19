import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/auth-store'
import { Skeleton } from '@/shared/ui/skeleton'

function AuthLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <Skeleton className="h-8 w-48" />
    </div>
  )
}

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const location = useLocation()

  if (!isHydrated) return <AuthLoading />
  if (!user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />
  }

  return <Outlet />
}

export function GuestRoute() {
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  if (!isHydrated) return <AuthLoading />
  if (user) {
    return <Navigate to={user.onboarding_completed ? '/dashboard' : '/onboarding'} replace />
  }

  return <Outlet />
}

export function OnboardingGuard() {
  const user = useAuthStore((s) => s.user)

  if (!user) return <Navigate to="/login" replace />
  if (!user.onboarding_completed) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}

export function OnboardingOnlyRoute() {
  const user = useAuthStore((s) => s.user)

  if (!user) return <Navigate to="/login" replace />
  if (user.onboarding_completed) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
