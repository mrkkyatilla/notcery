import { apiRequest } from '@/shared/api/client'

export type LabImportStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type LabImport = {
  id: string
  workspace_id?: string
  status: LabImportStatus
  source_type: 'zip' | 'git'
  source_label: string
  source_payload?: Record<string, unknown>
  root_folder_id?: string | null
  stats?: {
    total_candidates?: number
    imported?: number
    skipped?: number
    failed?: number
    bytes_imported?: number
  }
  error_message?: string
  created_at?: string
  updated_at?: string
}

type ListResponse<T> = { results: T[] }

export async function startLabImportZip(
  workspaceId: string,
  body: {
    file_key: string
    original_filename: string
    size_bytes: number
    parent_folder_id?: string
    label?: string
  },
): Promise<LabImport> {
  return apiRequest<LabImport>(`/workspaces/${workspaceId}/lab/imports/zip`, {
    method: 'POST',
    body,
  })
}

export async function startLabImportGit(
  workspaceId: string,
  body: {
    url: string
    branch?: string
    parent_folder_id?: string
    label?: string
  },
): Promise<LabImport> {
  return apiRequest<LabImport>(`/workspaces/${workspaceId}/lab/imports/git`, {
    method: 'POST',
    body,
  })
}

export async function getLabImport(importId: string): Promise<LabImport> {
  return apiRequest<LabImport>(`/lab/imports/${importId}`)
}

export async function listLabImports(workspaceId: string): Promise<LabImport[]> {
  const data = await apiRequest<ListResponse<LabImport>>(
    `/workspaces/${workspaceId}/lab/imports`,
  )
  return data.results
}
