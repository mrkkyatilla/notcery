import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  chatQuotaRemaining,
  planQuotaRemaining,
} from '@/features/billing/quota-helpers'
import { useBillingMe } from '@/features/billing/queries'
import { cn } from '@/shared/lib/utils'

export function BillingUsageChips() {
  const { t } = useTranslation('billing')
  const billing = useBillingMe()

  if (!billing.data || billing.data.tier === 'pro') {
    return (
      <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary sm:inline">
        {t('tier.pro')}
      </span>
    )
  }

  const plan = planQuotaRemaining(billing.data)
  const chat = chatQuotaRemaining(billing.data)

  return (
    <div className="hidden items-center gap-2 sm:flex">
      {plan.limit != null ? (
        <Link
          to="/settings/billing"
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium',
            plan.used >= plan.limit
              ? 'bg-destructive/15 text-destructive'
              : 'bg-muted text-muted-foreground hover:text-foreground',
          )}
          title={t('quota.planTooltip')}
        >
          {t('quota.planChip', { used: plan.used, limit: plan.limit })}
        </Link>
      ) : null}
      {chat.limit != null ? (
        <Link
          to="/settings/billing"
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium',
            chat.used >= chat.limit
              ? 'bg-destructive/15 text-destructive'
              : 'bg-muted text-muted-foreground hover:text-foreground',
          )}
          title={t('quota.chatTooltip')}
        >
          {t('quota.chatChip', { used: chat.used, limit: chat.limit })}
        </Link>
      ) : null}
    </div>
  )
}
