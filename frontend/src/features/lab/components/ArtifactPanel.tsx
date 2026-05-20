import { useTranslation } from 'react-i18next'

import { labFileIcon } from '@/features/lab/file-icons'
import { useLabArtifacts, useLabSession } from '@/features/lab/queries'
import type { LabFile } from '@/features/lab/types'
import { cn } from '@/shared/lib/utils'

type Props = {
  workspaceId: string
  selectedFileId: string | null
  onSelectFile: (file: LabFile) => void
}

export function ArtifactPanel({ workspaceId, selectedFileId, onSelectFile }: Props) {
  const { t } = useTranslation('lab')
  const sessionQuery = useLabSession(workspaceId)
  const sessionId = sessionQuery.data?.id
  const artifactsQuery = useLabArtifacts(workspaceId, sessionId)

  return (
    <div className="flex h-full flex-col border-l bg-card/30">
      <div className="border-b px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('artifacts.title')}
        </p>
        <p className="text-xs text-muted-foreground">{t('artifacts.hint')}</p>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {!artifactsQuery.data?.length ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            {t('artifacts.empty')}
          </p>
        ) : (
          artifactsQuery.data.map((file) => (
            <button
              key={file.id}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-sm transition-colors hover:bg-muted/50',
                selectedFileId === file.id && 'border-primary/50 bg-primary/5',
              )}
              onClick={() => onSelectFile(file)}
            >
              {labFileIcon(file.name)}
              <span className="truncate font-medium">{file.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
