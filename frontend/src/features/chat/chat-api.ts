import { apiRequest } from '@/shared/api/client'

import type {
  ChatMessage,
  ChatMessageCreate,
  ChatMessageResponse,
  ChatSession,
} from '@/features/chat/types'

type ListResponse<T> = { results: T[] }

export async function createChatSession(workspaceId: string): Promise<ChatSession> {
  return apiRequest<ChatSession>(`/workspaces/${workspaceId}/chat/sessions`, {
    method: 'POST',
  })
}

export async function listChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const data = await apiRequest<ListResponse<ChatMessage>>(
    `/chat/sessions/${sessionId}/messages`,
  )
  return data.results
}

export async function sendChatMessage(
  sessionId: string,
  body: ChatMessageCreate,
): Promise<ChatMessageResponse> {
  return apiRequest<ChatMessageResponse>(`/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body,
  })
}
