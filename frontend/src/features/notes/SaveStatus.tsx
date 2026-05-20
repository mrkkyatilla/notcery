import { useTranslation } from 'react-i18next'

import type { SaveStatus as SaveStatusType } from '@/features/notes/types'

export function SaveStatus({ status }: { status: SaveStatusType }) {
  const { t } = useTranslation('notes')

  if (status === 'idle') return null

  return (
    <span
      className="text-xs text-muted-foreground"
      data-testid="note-save-status"
      data-status={status}
    >
      {t(`saveStatus.${status}`)}
    </span>
  )
}
