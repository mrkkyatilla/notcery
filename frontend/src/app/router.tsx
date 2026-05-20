import { createBrowserRouter } from 'react-router-dom'

import {
  GuestRoute,
  OnboardingGuard,
  OnboardingOnlyRoute,
  ProtectedRoute,
} from '@/app/guards/AuthGuards'
import { AgentLayout } from '@/app/layouts/AgentLayout'
import { AppLayout } from '@/app/layouts/AppLayout'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { NotesLayout } from '@/app/layouts/NotesLayout'
import { SettingsLayout } from '@/app/layouts/SettingsLayout'
import {
  DashboardPage,
  LabPage,
  LibraryPage,
  LoginPage,
  NotesPage,
  OnboardingPage,
  PlannerPage,
  RegisterPage,
  SettingsAccountPage,
  SettingsBillingPage,
  SettingsProfilePage,
} from '@/app/lazy-pages'
import { HomePage } from '@/app/pages/HomePage'
import { wrapLazyPage } from '@/app/wrap-lazy-page'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: 'login', element: wrapLazyPage(LoginPage) },
          { path: 'register', element: wrapLazyPage(RegisterPage) },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <OnboardingOnlyRoute />,
        children: [{ path: 'onboarding', element: wrapLazyPage(OnboardingPage) }],
      },
      {
        element: <OnboardingGuard />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: 'dashboard', element: wrapLazyPage(DashboardPage) },
              { path: 'planner', element: wrapLazyPage(PlannerPage) },
              { path: 'w/:workspaceId/library', element: wrapLazyPage(LibraryPage) },
              {
                element: <SettingsLayout />,
                children: [
                  { path: 'settings/profile', element: wrapLazyPage(SettingsProfilePage) },
                  { path: 'settings/billing', element: wrapLazyPage(SettingsBillingPage) },
                  { path: 'settings/account', element: wrapLazyPage(SettingsAccountPage) },
                ],
              },
            ],
          },
          {
            element: <NotesLayout />,
            children: [
              { path: 'w/:workspaceId/notes', element: wrapLazyPage(NotesPage) },
              { path: 'w/:workspaceId/notes/:noteId', element: wrapLazyPage(NotesPage) },
            ],
          },
          {
            element: <AgentLayout />,
            children: [
              { path: 'w/:workspaceId/lab', element: wrapLazyPage(LabPage) },
              { path: 'w/:workspaceId/lab/files/:fileId', element: wrapLazyPage(LabPage) },
            ],
          },
        ],
      },
    ],
  },
])
