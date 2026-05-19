import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { generatePlan, getTaskStatus, retryTask } from '@/features/ai-plan/ai-plan-api'
import { usePlanGenerationStore } from '@/features/ai-plan/plan-generation-store'
import {
  pollIntervalMs,
  taskStatusToPhase,
  type TaskPollPhase,
} from '@/features/ai-plan/task-poll'
import type { PlanGenerateRequest } from '@/features/ai-plan/types'
import { showApiError } from '@/shared/api/show-api-error'
import { ApiError } from '@/shared/api/errors'

export function taskKey(taskId: string) {
  return ['async-task', taskId] as const
}

export function usePlanTaskPoll(taskId: string | null, enabled: boolean) {
  const query = useQuery({
    queryKey: taskKey(taskId ?? ''),
    queryFn: () => getTaskStatus(taskId!),
    enabled: Boolean(taskId && enabled),
    refetchInterval: (q) => {
      const status = q.state.data?.status
      const phase = taskStatusToPhase(status)
      return pollIntervalMs(phase)
    },
  })

  const phase: TaskPollPhase = taskId
    ? taskStatusToPhase(query.data?.status)
  : 'idle'

  return { ...query, phase }
}

export function useGeneratePlan(workspaceId: string | null) {
  const queryClient = useQueryClient()
  const setGenerating = usePlanGenerationStore((s) => s.setGenerating)
  const setAdjustments = usePlanGenerationStore((s) => s.setAdjustments)

  return useMutation({
    mutationFn: (body: PlanGenerateRequest) => generatePlan(workspaceId!, body),
    onMutate: () => {
      setGenerating(true, null)
      setAdjustments(null)
    },
    onSuccess: (accepted) => {
      setGenerating(true, accepted.task_id)
    },
    onError: (error) => {
      setGenerating(false, null)
      if (error instanceof ApiError && String(error.code) === 'QUOTA_EXCEEDED') {
        showApiError(error)
        return
      }
      showApiError(error)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['billing', 'me'] })
    },
  })
}

export function useRetryPlanTask() {
  const queryClient = useQueryClient()
  const setGenerating = usePlanGenerationStore((s) => s.setGenerating)

  return useMutation({
    mutationFn: (taskId: string) => retryTask(taskId),
    onMutate: () => setGenerating(true),
    onSuccess: (task) => {
      setGenerating(true, task.task_id)
      void queryClient.setQueryData(taskKey(task.task_id), task)
    },
    onError: showApiError,
  })
}
