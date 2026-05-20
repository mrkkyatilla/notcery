import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { LabFilePreview } from '@/features/lab/components/LabFilePreview'
import { fileIconColorClass } from '@/features/lab/file-icon-colors'
import { labFileIcon } from '@/features/lab/file-icons'
import { useLabFileContent } from '@/features/lab/queries'
import type { LabFile } from '@/features/lab/types'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

type Props = {
  file: LabFile | null
}

export function FileViewer({ file }: Props) {
  const { t } = useTranslation('lab')
  const contentQuery = useLabFileContent(file?.id)

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-sm text-[#858585]">
        {t('viewer.empty')}
      </div>
    )
  }

  const downloadUrl = contentQuery.data?.download_url

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#1e1e1e] text-[#cccccc]">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#3c3c3c] bg-[#252526] px-3 py-1.5">
        <span className={cn(fileIconColorClass(file.name))}>{labFileIcon(file.name)}</span>
        <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
        {file.index_status && file.index_status !== 'ready' ? (
          <span className="text-[10px] uppercase text-amber-500">{file.index_status}</span>
        ) : null}
        {downloadUrl ? (
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
            <a href={downloadUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
              {t('viewer.download')}
            </a>
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <LabFilePreview file={file} />
      </div>
    </div>
  )
}
