import type { ChatSession } from '@/features/chat/types'

const SESSION_KEY = 'notcery_chat_session'

export function loadChatSession(workspaceId: string): ChatSession | null {
  try {
    const raw = sessionStorage.getItem(`${SESSION_KEY}_${workspaceId}`)
    return raw ? (JSON.parse(raw) as ChatSession) : null
  } catch {
    return null
  }
}

export function saveChatSession(workspaceId: string, session: ChatSession): void {
  sessionStorage.setItem(`${SESSION_KEY}_${workspaceId}`, JSON.stringify(session))
}

export function clearChatSession(workspaceId: string): void {
  sessionStorage.removeItem(`${SESSION_KEY}_${workspaceId}`)
}
