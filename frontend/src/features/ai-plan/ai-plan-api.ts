import { apiRequest } from '@/shared/api/client'

import type {
  AsyncTaskAccepted,
  PlanGenerateRequest,
  PlanTask,
} from '@/features/ai-plan/types'

export async function generatePlan(
  workspaceId: string,
  body: PlanGenerateRequest,
): Promise<AsyncTaskAccepted> {
  return apiRequest<AsyncTaskAccepted>(`/workspaces/${workspaceId}/plans/generate`, {
    method: 'POST',
    body,
  })
}

export async function getTaskStatus(taskId: string): Promise<PlanTask> {
  return apiRequest<PlanTask>(`/tasks/${taskId}`)
}

export async function retryTask(taskId: string): Promise<PlanTask> {
  return apiRequest<PlanTask>(`/tasks/${taskId}/retry`, { method: 'POST' })
}
