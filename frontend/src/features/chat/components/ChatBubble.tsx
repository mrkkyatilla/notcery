import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CitationCard } from '@/features/chat/components/CitationCard'
import { MarkdownMessage } from '@/features/chat/components/MarkdownMessage'
import type { ChatMessage } from '@/features/chat/types'
import { AIFeedbackButtons } from '@/features/feedback/AIFeedbackButtons'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

const READ_MORE_CHARS = 900
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Props = {
  message: ChatMessage
  workspaceId: string
}

export function ChatBubble({ message, workspaceId }: Props) {
  const { t } = useTranslation('chat')
  const isUser = message.role === 'user'
  const [expanded, setExpanded] = useState(false)
  const content = message.content ?? ''
  const long = !isUser && content.length > READ_MORE_CHARS
  const visible = long && !expanded ? `${content.slice(0, READ_MORE_CHARS)}…` : content
  const canFeedback = !isUser && Boolean(message.id && UUID_RE.test(message.id))

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[92%] rounded-2xl px-3 py-2 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'border bg-card text-foreground',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <>
            <MarkdownMessage content={visible} />
            {long ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-1 h-auto p-0 text-xs"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? t('readLess') : t('readMore')}
              </Button>
            ) : null}
          </>
        )}

        {!isUser && message.citations?.length ? (
          <div className="mt-3 space-y-1.5 border-t pt-2">
            <p className="text-xs font-medium text-muted-foreground">{t('sources')}</p>
            <div className="flex flex-col gap-1.5">
              {message.citations.map((citation, index) => (
                <CitationCard
                  key={citation.chunk_id ?? `${index}-${citation.excerpt?.slice(0, 12)}`}
                  citation={citation}
                  workspaceId={workspaceId}
                />
              ))}
            </div>
          </div>
        ) : null}

        {canFeedback && message.id ? (
          <AIFeedbackButtons
            targetType="chat_message"
            targetId={message.id}
            className="mt-2 border-t pt-2"
          />
        ) : null}
      </div>
    </div>
  )
}
