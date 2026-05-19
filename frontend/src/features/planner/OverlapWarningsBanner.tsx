import { useTranslation } from 'react-i18next'

import type { EventOverlapWarning } from '@/features/planner/types'

type Props = {
  warnings: EventOverlapWarning[]
}

export function OverlapWarningsBanner({ warnings }: Props) {
  const { t } = useTranslation('planner')

  if (!warnings.length) return null

  return (
    <div
      role="status"
      className="rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
    >
      <p className="font-medium">{t('overlap.title')}</p>
      <ul className="mt-2 list-inside list-disc">
        {warnings.map((w) => (
          <li key={w.event_id}>
            {w.title} — {w.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
