import { labFileIcon } from '@/features/lab/file-icons'
import type { LabCitation } from '@/features/lab/types'
import { cn } from '@/shared/lib/utils'

type Props = {
  citation: LabCitation
  onOpen?: (labFileId: string) => void
}

export function LabCitationCard({ citation, onOpen }: Props) {
  const label = citation.label?.trim() || 'File'
  const fileId = citation.lab_file_id

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5 text-left text-sm transition-colors',
        fileId && 'hover:border-primary/40',
      )}
      disabled={!fileId}
      onClick={() => fileId && onOpen?.(fileId)}
    >
      {labFileIcon(label)}
      <span className="truncate font-medium">{label}</span>
    </button>
  )
}
