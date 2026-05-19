import { useTranslation } from 'react-i18next'

import type { DocumentStatus } from '@/features/library/types'
import { cn } from '@/shared/lib/utils'

const statusClass: Record<DocumentStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  processing: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  ready: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  failed: 'bg-destructive/15 text-destructive',
}

type Props = {
  status: DocumentStatus | undefined
}

export function DocumentStatusBadge({ status }: Props) {
  const { t } = useTranslation('library')
  const key = status ?? 'pending'

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        statusClass[key],
      )}
    >
      {t(`status.${key}`)}
    </span>
  )
}
