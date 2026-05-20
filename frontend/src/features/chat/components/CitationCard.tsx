import { FileText, NotebookPen, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import type { ChatCitation } from '@/features/chat/types'
import { cn } from '@/shared/lib/utils'

type Props = {
  citation: ChatCitation
  workspaceId: string
}

function sourceLabelKey(sourceType: string | undefined): string {
  if (sourceType === 'note') return 'note'
  if (sourceType === 'performance') return 'performance'
  return 'document'
}

function SourceIcon({ sourceType }: { sourceType: string | undefined }) {
  const className = 'size-4 shrink-0 text-muted-foreground'
  if (sourceType === 'note') return <NotebookPen className={className} />
  if (sourceType === 'performance') return <TrendingUp className={className} />
  return <FileText className={className} />
}

function displayTitle(citation: ChatCitation, fallback: string): string {
  const label = citation.label?.trim()
  if (label) return label
  return fallback
}

export function CitationCard({ citation, workspaceId }: Props) {
  const { t } = useTranslation('chat')
  const typeLabel = t(`citation.${sourceLabelKey(citation.source_type)}`)
  const title = displayTitle(citation, typeLabel)

  const href =
    citation.note_id != null
      ? `/w/${workspaceId}/notes/${citation.note_id}`
      : citation.document_id != null
        ? `/w/${workspaceId}/library`
        : null

  const body = (
    <div className="flex items-center gap-2">
      <SourceIcon sourceType={citation.source_type} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground" title={title}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{typeLabel}</p>
      </div>
    </div>
  )

  return (
    <div
      className={cn(
        'rounded-md border bg-muted/30 px-3 py-2 transition-colors',
        href && 'hover:border-primary/40',
      )}
    >
      {href ? (
        <Link to={href} className="block text-foreground no-underline">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  )
}
