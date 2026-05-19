import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { WaitlistForm } from '@/features/growth/WaitlistForm'
import { LocaleThemeControls } from '@/features/settings/LocaleThemeControls'
import { Button } from '@/shared/ui/button'

export function LandingPage() {
  const { t } = useTranslation(['landing', 'common'])

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold">{t('common:app.name')}</span>
          <div className="flex items-center gap-2">
            <LocaleThemeControls layout="compact" />
            <Button variant="outline" size="sm" asChild>
              <Link to="/login">{t('landing:cta.login')}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16">
        <section className="space-y-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t('landing:hero.title')}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {t('landing:hero.subtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/register">{t('landing:cta.register')}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">{t('landing:cta.login')}</Link>
            </Button>
          </div>
        </section>

        <section className="mt-20 grid gap-6 sm:grid-cols-3">
          {(['planner', 'notes', 'ai'] as const).map((key) => (
            <div key={key} className="rounded-xl border bg-card p-6 text-left">
              <h2 className="font-semibold">{t(`landing:features.${key}.title`)}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(`landing:features.${key}.body`)}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-20 rounded-xl border bg-muted/30 p-8 text-center">
          <h2 className="text-2xl font-semibold">{t('landing:waitlist.title')}</h2>
          <p className="mt-2 text-muted-foreground">{t('landing:waitlist.subtitle')}</p>
          <div className="mt-6">
            <WaitlistForm />
          </div>
        </section>

        <footer className="mt-16 flex flex-wrap justify-center gap-4 border-t pt-8 text-xs text-muted-foreground">
          <a href="https://status.notcery.app" className="hover:underline">
            {t('landing:footer.status')}
          </a>
          <span>·</span>
          <span>{t('landing:footer.legal')}</span>
        </footer>
      </main>
    </div>
  )
}
