import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { I18nextProvider } from 'react-i18next'
import { RouterProvider } from 'react-router-dom'

import { AuthBootstrap } from '@/app/bootstrap/AuthBootstrap'
import { PublicConfigProvider } from '@/app/bootstrap/PublicConfigProvider'
import { queryClient } from '@/app/query-client'
import { router } from '@/app/router'
import i18n from '@/shared/i18n'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import { Toaster } from '@/shared/ui/sonner'

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <PublicConfigProvider>
            <AuthBootstrap>
              <RouterProvider router={router} />
            </AuthBootstrap>
          </PublicConfigProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </I18nextProvider>
      {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}
