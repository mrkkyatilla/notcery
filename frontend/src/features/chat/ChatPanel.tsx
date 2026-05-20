import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ChatComposer } from '@/features/chat/components/ChatComposer'
import { ChatMessageList } from '@/features/chat/components/ChatMessageList'
import { ChatQuotaChip } from '@/features/chat/components/ChatQuotaChip'
import {
  useChatMessages,
  useChatSession,
  useSendChatMessage,
} from '@/features/chat/queries'
import type { ChatContextInput } from '@/features/chat/types'
import { ApiError } from '@/shared/api/errors'
import { Skeleton } from '@/shared/ui/skeleton'

type Props = {
  workspaceId: string
  noteId?: string | null
  subjectId?: string | null
  onAppendToNote?: (markdown: string) => void
}

export function ChatPanel({ workspaceId, noteId, subjectId, onAppendToNote }: Props) {
  const { t } = useTranslation('chat')
  const sessionQuery = useChatSession(workspaceId)
  const sessionId = sessionQuery.data?.id

  const [useRag, setUseRag] = useState(true)
  const [useGrounding, setUseGrounding] = useState(false)

  const contextInput: ChatContextInput = {
    noteId: noteId ?? null,
    subjectId: subjectId ?? null,
    useRag,
    useGrounding,
  }

  const messagesQuery = useChatMessages(sessionId)
  const sendMutation = useSendChatMessage(workspaceId, sessionId, contextInput)

  const handleSend = (content: string) => {
    void sendMutation.mutateAsync(content).catch((error: unknown) => {
      if (error instanceof ApiError && String(error.code) === 'QUOTA_EXCEEDED') {
        return
      }
    })
  }

  return (
    <aside className="flex h-full flex-col border-l bg-card">
      <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div>
          <h2 className="font-semibold">{t('title')}</h2>
          {sessionId ? (
            <p className="text-xs text-muted-foreground">
              {t('session', { id: sessionId.slice(0, 8) })}
            </p>
          ) : (
            <Skeleton className="mt-1 h-3 w-24" />
          )}
        </div>
        <ChatQuotaChip />
      </div>

      <ChatMessageList
        messages={messagesQuery.data}
        isLoading={messagesQuery.isLoading || sessionQuery.isLoading}
        isSending={sendMutation.isPending}
        workspaceId={workspaceId}
        noteId={noteId}
        onAppendToNote={onAppendToNote}
      />

      <ChatComposer
        disabled={!sessionId}
        isSending={sendMutation.isPending}
        noteId={noteId}
        useRag={useRag}
        useGrounding={useGrounding}
        onUseRagChange={setUseRag}
        onUseGroundingChange={setUseGrounding}
        onSend={handleSend}
      />
    </aside>
  )
}
