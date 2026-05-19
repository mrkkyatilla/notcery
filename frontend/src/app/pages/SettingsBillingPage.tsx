import { useTranslation } from 'react-i18next'

import { useBillingCheckout, useBillingMe, useBillingPortal } from '@/features/billing/queries'
import {
  chatQuotaRemaining,
  parseBillingLimits,
  parseBillingUsage,
  planQuotaRemaining,
} from '@/features/billing/quota-helpers'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

function UsageRow({
  label,
  used,
  limit,
}: {
  label: string
  used: number
  limit: number | null
}) {
  if (limit == null) {
    return (
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{used}</span>
      </div>
    )
  }
  const pct = Math.min(100, Math.round((used / limit) * 100))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function SettingsBillingPage() {
  const { t } = useTranslation('billing')
  const billing = useBillingMe()
  const checkout = useBillingCheckout()
  const portal = useBillingPortal()

  const limits = parseBillingLimits(billing.data?.limits)
  const usage = parseBillingUsage(billing.data?.usage)
  const plan = planQuotaRemaining(billing.data)
  const chat = chatQuotaRemaining(billing.data)
  const isPro = billing.data?.tier === 'pro'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('page.title')}</CardTitle>
        <CardDescription>{t('page.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('tier.label')}</p>
            <p className="text-lg font-semibold">
              {isPro ? t('tier.pro') : t('tier.free')}
            </p>
          </div>
          {isPro ? (
            <Button
              type="button"
              variant="outline"
              disabled={portal.isPending}
              onClick={() => portal.mutate()}
            >
              {t('actions.manage')}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={checkout.isPending}
              onClick={() => checkout.mutate()}
            >
              {t('actions.upgrade')}
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <UsageRow label={t('usage.plan')} used={plan.used} limit={plan.limit} />
          <UsageRow label={t('usage.chat')} used={chat.used} limit={chat.limit} />
          <UsageRow
            label={t('usage.storage')}
            used={usage.storage_mb ?? 0}
            limit={limits.storage_mb ?? null}
          />
        </div>

        {!isPro ? (
          <p className="text-xs text-muted-foreground">{t('page.proHint')}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
