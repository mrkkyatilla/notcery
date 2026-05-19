import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createChatSession,
  listChatMessages,
  sendChatMessage,
} from '@/features/chat/chat-api'
import {
  clearChatSession,
  loadChatSession,
  saveChatSession,
} from '@/features/chat/chat-session-storage'
import type { ChatContextInput, ChatMessage, ChatMessageCreate } from '@/features/chat/types'
import { ApiError } from '@/shared/api/errors'
import { showApiError } from '@/shared/api/show-api-error'

export function chatSessionKey(workspaceId: string) {
  return ['chat-session', workspaceId] as const
}

export function chatMessagesKey(sessionId: string) {
  return ['chat-messages', sessionId] as const
}

export function useChatSession(workspaceId: string) {
  return useQuery({
    queryKey: chatSessionKey(workspaceId),
    queryFn: async () => {
      const cached = loadChatSession(workspaceId)
      if (cached?.id) return cached
      const created = await createChatSession(workspaceId)
      saveChatSession(workspaceId, created)
      return created
    },
    staleTime: Infinity,
  })
}

export function useChatMessages(sessionId: string | undefined) {
  return useQuery({
    queryKey: chatMessagesKey(sessionId ?? ''),
    queryFn: () => listChatMessages(sessionId!),
    enabled: Boolean(sessionId),
  })
}

function buildContext(input: ChatContextInput): ChatMessageCreate['context'] {
  return {
    note_id: input.noteId ?? null,
    subject_id: input.subjectId ?? null,
    use_rag: input.useRag ?? true,
    use_grounding: input.useGrounding ?? false,
  }
}

export function useSendChatMessage(
  _workspaceId: string,
  sessionId: string | undefined,
  contextInput: ChatContextInput,
) {
  const queryClient = useQueryClient()
  const messagesKey = chatMessagesKey(sessionId ?? '')

  return useMutation({
    mutationFn: (content: string) => {
      const body: ChatMessageCreate = {
        content,
        context: buildContext(contextInput),
      }
      return sendChatMessage(sessionId!, body)
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
      const previous = queryClient.getQueryData<ChatMessage[]>(messagesKey) ?? []
      const optimistic: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      }
      queryClient.setQueryData<ChatMessage[]>(messagesKey, [...previous, optimistic])
      return { previous }
    },
    onSuccess: (response, content, ctx) => {
      const base = ctx?.previous ?? []
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      }
      const assistant: ChatMessage = {
        id: response.message?.id ?? `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message?.content ?? '',
        citations: response.citations,
        created_at: new Date().toISOString(),
      }
      queryClient.setQueryData<ChatMessage[]>(messagesKey, [...base, userMsg, assistant])
      void queryClient.invalidateQueries({ queryKey: ['billing', 'me'] })
    },
    onError: (error, _content, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(messagesKey, ctx.previous)
      }
      if (error instanceof ApiError && String(error.code) === 'QUOTA_EXCEEDED') {
        showApiError(error)
        return
      }
      showApiError(error)
    },
  })
}

export function useResetChatSession(workspaceId: string) {
  const queryClient = useQueryClient()
  return () => {
    clearChatSession(workspaceId)
    void queryClient.invalidateQueries({ queryKey: chatSessionKey(workspaceId) })
    void queryClient.removeQueries({ queryKey: ['chat-messages'] })
  }
}
