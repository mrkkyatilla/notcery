import { apiRequest } from '@/shared/api/client'

import type {
  PlanSaveRequest,
  PlanVersion,
  PlanVersionDetail,
  StudyEvent,
  StudyEventCreate,
  StudyEventResponse,
  StudyEventUpdate,
} from '@/features/planner/types'

type ListResponse<T> = { results: T[] }

export async function listStudyEvents(
  workspaceId: string,
  from: string,
  to: string,
): Promise<StudyEvent[]> {
  const params = new URLSearchParams({ from, to })
  const data = await apiRequest<ListResponse<StudyEvent>>(
    `/workspaces/${workspaceId}/events?${params.toString()}`,
  )
  return data.results
}

export async function createStudyEvent(
  workspaceId: string,
  body: StudyEventCreate,
): Promise<StudyEventResponse> {
  return apiRequest<StudyEventResponse>(`/workspaces/${workspaceId}/events`, {
    method: 'POST',
    body,
  })
}

export async function updateStudyEvent(
  eventId: string,
  body: StudyEventUpdate,
): Promise<StudyEventResponse> {
  return apiRequest<StudyEventResponse>(`/events/${eventId}`, {
    method: 'PATCH',
    body,
  })
}

export async function deleteStudyEvent(eventId: string): Promise<void> {
  return apiRequest<void>(`/events/${eventId}`, { method: 'DELETE' })
}

export async function savePlan(
  workspaceId: string,
  body: PlanSaveRequest,
): Promise<PlanVersion> {
  return apiRequest<PlanVersion>(`/workspaces/${workspaceId}/plans/save`, {
    method: 'POST',
    body,
  })
}

export async function getPlanVersion(versionId: string): Promise<PlanVersionDetail> {
  return apiRequest<PlanVersionDetail>(`/plans/versions/${versionId}`)
}

export async function activatePlanVersion(versionId: string): Promise<PlanVersion> {
  return apiRequest<PlanVersion>(`/plans/versions/${versionId}/activate`, {
    method: 'POST',
  })
}
