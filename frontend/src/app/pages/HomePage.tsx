import { Navigate } from 'react-router-dom'

import { LandingPage } from '@/app/pages/LandingPage'
import { useAuthStore } from '@/features/auth/auth-store'

export function HomePage() {
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  if (!isHydrated) return null
  if (user) {
    if (!user.onboarding_completed) return <Navigate to="/onboarding" replace />
    return <Navigate to="/dashboard" replace />
  }
  return <LandingPage />
}
