import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AppProviders } from '@/app/providers'
import { initSentry } from '@/shared/observability/sentry'
import '@/shared/i18n'
import './index.css'

initSentry()

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') return

  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

void enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders />
    </StrictMode>,
  )
})
