import * as Sentry from '@sentry/react'

type SentryUserContext = {
  id: string
  locale?: string
  theme?: string
}

let initialized = false

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn || initialized) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1,
  })
  initialized = true
}

export function setSentryUser(user: SentryUserContext | null): void {
  if (!initialized) return
  if (!user) {
    Sentry.setUser(null)
    return
  }
  Sentry.setUser({ id: user.id })
  Sentry.setTag('locale', user.locale ?? 'unknown')
  Sentry.setTag('theme', user.theme ?? 'unknown')
}
