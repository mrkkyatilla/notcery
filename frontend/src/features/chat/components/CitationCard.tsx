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
  const className = 'size-3.5 shrink-0'
  if (sourceType === 'note') return <NotebookPen className={className} />
  if (sourceType === 'performance') return <TrendingUp className={className} />
  return <FileText className={className} />
}

export function CitationCard({ citation, workspaceId }: Props) {
  const { t } = useTranslation('chat')
  const labelKey = sourceLabelKey(citation.source_type)

  const href =
    citation.note_id != null
      ? `/w/${workspaceId}/notes/${citation.note_id}`
      : citation.document_id != null
        ? `/w/${workspaceId}/library`
        : null

  const body = (
    <>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <SourceIcon sourceType={citation.source_type} />
        <span>{t(`citation.${labelKey}`)}</span>
      </div>
      <p className="line-clamp-4 text-xs leading-relaxed">{citation.excerpt}</p>
    </>
  )

  return (
    <div
      className={cn(
        'rounded-md border bg-muted/40 p-2.5 transition-colors',
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
