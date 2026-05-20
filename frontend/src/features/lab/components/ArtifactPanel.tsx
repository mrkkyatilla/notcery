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
    <div className="flex max-h-[min(220px,28vh)] shrink-0 flex-col border-t border-[#3c3c3c] bg-[#1e1e1e]">
      <div className="shrink-0 border-b border-[#3c3c3c] px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#858585]">
          {t('artifacts.title')}
        </p>
        <p className="text-[10px] text-[#858585]">{t('artifacts.hint')}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-2">
        {!artifactsQuery.data?.length ? (
          <p className="px-2 py-3 text-center text-xs text-[#858585]">{t('artifacts.empty')}</p>
        ) : (
          artifactsQuery.data.map((file) => (
            <button
              key={file.id}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-[#2a2d2e]',
                selectedFileId === file.id && 'bg-[#094771] text-white',
              )}
              onClick={() => onSelectFile(file)}
            >
              {labFileIcon(file.name, 'size-3.5 shrink-0')}
              <span className="truncate">{file.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
