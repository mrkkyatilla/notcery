import { useTranslation } from 'react-i18next'

import { useBillingMe } from '@/features/billing/queries'
import { chatQuotaRemaining } from '@/features/billing/quota-helpers'
import { cn } from '@/shared/lib/utils'

type Props = {
  className?: string
}

export function ChatQuotaChip({ className }: Props) {
  const { t } = useTranslation('chat')
  const billing = useBillingMe()
  const { used, limit } = chatQuotaRemaining(billing.data)

  if (limit == null) return null

  const nearLimit = used >= limit * 0.9

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium',
        nearLimit
          ? 'bg-destructive/15 text-destructive'
          : 'bg-muted text-muted-foreground',
        className,
      )}
      title={t('quota.tooltip', { used, limit })}
    >
      {t('quota.chip', { used, limit })}
    </span>
  )
}
