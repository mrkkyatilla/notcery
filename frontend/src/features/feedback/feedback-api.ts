import { apiRequest } from '@/shared/api/client'
import type { components } from '@/shared/api/schema'

export type AIFeedbackCreate = components['schemas']['AIFeedbackCreate']

export async function submitAIFeedback(body: AIFeedbackCreate): Promise<void> {
  await apiRequest<void>('/feedback/ai', { method: 'POST', body })
}
