import { apiRequest } from '@/shared/api/client'
import type { components } from '@/shared/api/schema'

export type Workspace = components['schemas']['Workspace']
export type WorkspaceCreate = components['schemas']['WorkspaceCreate']
export type Subject = components['schemas']['Subject']
export type SubjectCreate = components['schemas']['SubjectCreate']

type ListResponse<T> = { results: T[] }

export async function listWorkspaces(): Promise<Workspace[]> {
  const data = await apiRequest<ListResponse<Workspace>>('/workspaces')
  return data.results
}

export async function createWorkspace(body: WorkspaceCreate): Promise<Workspace> {
  return apiRequest<Workspace>('/workspaces', { method: 'POST', body })
}

export async function listSubjects(workspaceId: string): Promise<Subject[]> {
  const data = await apiRequest<ListResponse<Subject>>(
    `/workspaces/${workspaceId}/subjects`,
  )
  return data.results
}

export async function createSubject(
  workspaceId: string,
  body: SubjectCreate,
): Promise<Subject> {
  return apiRequest<Subject>(`/workspaces/${workspaceId}/subjects`, {
    method: 'POST',
    body,
  })
}
