import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { ChatBubble } from '@/features/chat/components/ChatBubble'
import type { ChatMessage } from '@/features/chat/types'
import { Skeleton } from '@/shared/ui/skeleton'

type Props = {
  messages: ChatMessage[] | undefined
  isLoading: boolean
  isSending: boolean
  workspaceId: string
  noteId?: string | null
  onAppendToNote?: (markdown: string) => void
}

export function ChatMessageList({
  messages,
  isLoading,
  isSending,
  workspaceId,
  noteId,
  onAppendToNote,
}: Props) {
  const { t } = useTranslation('chat')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages?.length, isSending])

  if (isLoading) {
    return (
      <div className="flex-1 space-y-3 p-4">
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="ml-auto h-12 w-2/3" />
      </div>
    )
  }

  if (!messages?.length) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-center text-sm text-muted-foreground">{t('empty')}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.map((message) => (
        <ChatBubble
          key={message.id ?? `${message.role}-${message.created_at}`}
          message={message}
          workspaceId={workspaceId}
          noteId={noteId}
          onAppendToNote={onAppendToNote}
        />
      ))}
      {isSending ? (
        <p className="text-xs text-muted-foreground animate-pulse">{t('thinking')}</p>
      ) : null}
      <div ref={bottomRef} />
    </div>
  )
}
