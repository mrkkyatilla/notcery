import { apiRequest } from '@/shared/api/client'

import type {
  LabFile,
  LabFileCreate,
  LabFolder,
  LabMessage,
  LabMessageCreate,
  LabMessageResponse,
  LabSession,
  UploadUrlRequest,
  UploadUrlResponse,
} from '@/features/lab/types'

type ListResponse<T> = { results: T[] }

export async function listLabFolders(workspaceId: string): Promise<LabFolder[]> {
  const data = await apiRequest<ListResponse<LabFolder>>(
    `/workspaces/${workspaceId}/lab/folders`,
  )
  return data.results
}

export async function createLabFolder(
  workspaceId: string,
  body: { name: string; parent_id?: string | null },
): Promise<LabFolder> {
  return apiRequest<LabFolder>(`/workspaces/${workspaceId}/lab/folders`, {
    method: 'POST',
    body,
  })
}

export async function listLabFiles(
  workspaceId: string,
  params?: { folder_id?: string; kind?: string; session_id?: string },
): Promise<LabFile[]> {
  const qs = new URLSearchParams()
  if (params?.folder_id) qs.set('folder_id', params.folder_id)
  if (params?.kind) qs.set('kind', params.kind)
  if (params?.session_id) qs.set('session_id', params.session_id)
  const suffix = qs.toString() ? `?${qs}` : ''
  const data = await apiRequest<ListResponse<LabFile>>(
    `/workspaces/${workspaceId}/lab/files${suffix}`,
  )
  return data.results
}

export async function createLabUploadUrl(
  workspaceId: string,
  body: UploadUrlRequest,
): Promise<UploadUrlResponse> {
  return apiRequest<UploadUrlResponse>(
    `/workspaces/${workspaceId}/lab/files/upload-url`,
    { method: 'POST', body },
  )
}

export async function registerLabFile(
  workspaceId: string,
  body: LabFileCreate,
): Promise<LabFile> {
  return apiRequest<LabFile>(`/workspaces/${workspaceId}/lab/files`, {
    method: 'POST',
    body,
  })
}

export async function deleteLabFile(fileId: string): Promise<void> {
  await apiRequest<void>(`/lab/files/${fileId}`, { method: 'DELETE' })
}

export async function getLabFileContent(fileId: string): Promise<{
  content: string
  name: string
  mime_type: string
}> {
  return apiRequest(`/lab/files/${fileId}/content`)
}

export async function updateLabFileContent(
  fileId: string,
  content: string,
): Promise<LabFile> {
  return apiRequest<LabFile>(`/lab/files/${fileId}/content`, {
    method: 'PUT',
    body: { content },
  })
}

export async function createLabSession(
  workspaceId: string,
  body?: { title?: string; active_file_ids?: string[] },
): Promise<LabSession> {
  return apiRequest<LabSession>(`/workspaces/${workspaceId}/lab/sessions`, {
    method: 'POST',
    body: body ?? {},
  })
}

export async function updateLabSession(
  sessionId: string,
  body: Partial<{
    title: string
    active_file_ids: string[]
    settings: Record<string, unknown>
  }>,
): Promise<LabSession> {
  return apiRequest<LabSession>(`/lab/sessions/${sessionId}`, {
    method: 'PATCH',
    body,
  })
}

export async function listLabMessages(sessionId: string): Promise<LabMessage[]> {
  const data = await apiRequest<ListResponse<LabMessage>>(
    `/lab/sessions/${sessionId}/messages`,
  )
  return data.results
}

export async function sendLabMessage(
  sessionId: string,
  body: LabMessageCreate,
): Promise<LabMessageResponse> {
  return apiRequest<LabMessageResponse>(`/lab/sessions/${sessionId}/messages`, {
    method: 'POST',
    body,
  })
}
