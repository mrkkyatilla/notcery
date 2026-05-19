import type { components } from '@/shared/api/schema'

export type ChatSession = components['schemas']['ChatSession']
export type ChatMessage = components['schemas']['ChatMessage']
export type ChatMessageCreate = components['schemas']['ChatMessageCreate']
export type ChatMessageResponse = components['schemas']['ChatMessageResponse']
export type ChatMessageContext = components['schemas']['ChatMessageContext']
export type ChatCitation = components['schemas']['ChatCitation']

export type ChatContextInput = {
  noteId?: string | null
  subjectId?: string | null
  useRag?: boolean
  useGrounding?: boolean
}
