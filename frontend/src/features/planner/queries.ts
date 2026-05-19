import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  activatePlanVersion,
  createStudyEvent,
  deleteStudyEvent,
  listStudyEvents,
  savePlan,
  updateStudyEvent,
} from '@/features/planner/planner-api'
import { stripWarnings } from '@/features/planner/event-mappers'
import { addSavedPlan, markActivePlan } from '@/features/planner/plan-versions-store'
import type {
  PlanSaveRequest,
  StudyEvent,
  StudyEventCreate,
  StudyEventUpdate,
} from '@/features/planner/types'
import { showApiError } from '@/shared/api/show-api-error'

export function plannerEventsKey(workspaceId: string, from: string, to: string) {
  return ['planner-events', workspaceId, from, to] as const
}

export function useStudyEvents(
  workspaceId: string | null,
  from: string | null,
  to: string | null,
) {
  return useQuery({
    queryKey: plannerEventsKey(workspaceId ?? '', from ?? '', to ?? ''),
    queryFn: () => listStudyEvents(workspaceId!, from!, to!),
    enabled: Boolean(workspaceId && from && to),
  })
}

export function useCreateStudyEvent(workspaceId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: StudyEventCreate) => createStudyEvent(workspaceId!, body),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({
        queryKey: ['planner-events', workspaceId],
      })
      return response
    },
    onError: showApiError,
  })
}

export function useUpdateStudyEvent(
  workspaceId: string | null,
  range: { from: string; to: string },
) {
  const queryClient = useQueryClient()
  const queryKey = plannerEventsKey(workspaceId ?? '', range.from, range.to)

  return useMutation({
    mutationFn: ({ eventId, body }: { eventId: string; body: StudyEventUpdate }) =>
      updateStudyEvent(eventId, body),
    onMutate: async ({ eventId, body }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<StudyEvent[]>(queryKey)
      if (previous) {
        queryClient.setQueryData<StudyEvent[]>(
          queryKey,
          previous.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  ...body,
                  subject_id:
                    body.subject_id !== undefined ? body.subject_id : e.subject_id,
                }
              : e,
          ),
        )
      }
      return { previous }
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      showApiError(error)
    },
    onSuccess: (response) => {
      const event = stripWarnings(response)
      const previous = queryClient.getQueryData<StudyEvent[]>(queryKey)
      if (previous) {
        queryClient.setQueryData<StudyEvent[]>(
          queryKey,
          previous.map((e) => (e.id === event.id ? event : e)),
        )
      }
      return response
    },
  })
}

export function useDeleteStudyEvent(
  workspaceId: string | null,
  range: { from: string; to: string },
) {
  const queryClient = useQueryClient()
  const queryKey = plannerEventsKey(workspaceId ?? '', range.from, range.to)

  return useMutation({
    mutationFn: (eventId: string) => deleteStudyEvent(eventId),
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<StudyEvent[]>(queryKey)
      if (previous) {
        queryClient.setQueryData<StudyEvent[]>(
          queryKey,
          previous.filter((e) => e.id !== eventId),
        )
      }
      return { previous }
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      showApiError(error)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['planner-events', workspaceId] })
    },
  })
}

export function useSavePlan(workspaceId: string | null) {
  return useMutation({
    mutationFn: (body: PlanSaveRequest) => savePlan(workspaceId!, body),
    onSuccess: (plan) => {
      if (workspaceId) addSavedPlan(workspaceId, plan)
    },
    onError: showApiError,
  })
}

export function useActivatePlan(workspaceId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (versionId: string) => activatePlanVersion(versionId),
    onSuccess: (plan) => {
      if (workspaceId) markActivePlan(workspaceId, plan.id)
      void queryClient.invalidateQueries({ queryKey: ['planner-events', workspaceId] })
    },
    onError: showApiError,
  })
}
