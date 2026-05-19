import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useBillingMe } from '@/features/billing/queries'
import type { BillingLimits, BillingUsage } from '@/features/library/types'
import { Skeleton } from '@/shared/ui/skeleton'

function parseLimits(raw: Record<string, never> | undefined): BillingLimits {
  if (!raw || typeof raw !== 'object') return {}
  return raw as unknown as BillingLimits
}

function parseUsage(raw: Record<string, never> | undefined): BillingUsage {
  if (!raw || typeof raw !== 'object') return {}
  return raw as unknown as BillingUsage
}

export function StorageQuotaBar() {
  const { t } = useTranslation('library')
  const billingQuery = useBillingMe()

  if (billingQuery.isLoading) {
    return <Skeleton className="h-10 w-full max-w-md" />
  }

  const limits = parseLimits(billingQuery.data?.limits)
  const usage = parseUsage(billingQuery.data?.usage)
  const limitMb = limits.storage_mb
  const usedMb = usage.storage_mb ?? 0

  if (limitMb == null || limitMb <= 0) {
    return null
  }

  const pct = Math.min(100, Math.round((usedMb / limitMb) * 100))
  const nearFull = pct >= 90

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {t('quota.label', { used: usedMb.toFixed(1), limit: limitMb })}
        </span>
        {billingQuery.data?.tier === 'free' && nearFull ? (
          <Link to="/settings/billing" className="text-xs font-medium text-primary hover:underline">
            {t('quota.upgradeCta')}
          </Link>
        ) : null}
      </div>
      <div
        className="h-2 w-full max-w-md overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all ${nearFull ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
