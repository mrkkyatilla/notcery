import { lazy } from 'react'

export const LoginPage = lazy(() =>
  import('@/app/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)
export const RegisterPage = lazy(() =>
  import('@/app/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
)
export const OnboardingPage = lazy(() =>
  import('@/app/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
)
export const DashboardPage = lazy(() =>
  import('@/app/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
export const PlannerPage = lazy(() =>
  import('@/app/pages/PlannerPage').then((m) => ({ default: m.PlannerPage })),
)
export const LibraryPage = lazy(() =>
  import('@/app/pages/LibraryPage').then((m) => ({ default: m.LibraryPage })),
)
export const LabPage = lazy(() =>
  import('@/app/pages/LabPage').then((m) => ({ default: m.LabPage })),
)
export const NotesPage = lazy(() =>
  import('@/app/pages/NotesPage').then((m) => ({ default: m.NotesPage })),
)
export const SettingsProfilePage = lazy(() =>
  import('@/app/pages/SettingsProfilePage').then((m) => ({ default: m.SettingsProfilePage })),
)
export const SettingsBillingPage = lazy(() =>
  import('@/app/pages/SettingsBillingPage').then((m) => ({ default: m.SettingsBillingPage })),
)
export const SettingsAccountPage = lazy(() =>
  import('@/app/pages/SettingsAccountPage').then((m) => ({ default: m.SettingsAccountPage })),
)
