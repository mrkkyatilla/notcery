import { apiRequest } from '@/shared/api/client'

import type {
  Document,
  DocumentCreate,
  RetrieveRequest,
  RetrieveResponse,
  UploadUrlRequest,
  UploadUrlResponse,
} from '@/features/library/types'

type ListResponse<T> = { results: T[] }

export async function listDocuments(workspaceId: string): Promise<Document[]> {
  const data = await apiRequest<ListResponse<Document>>(
    `/workspaces/${workspaceId}/documents`,
  )
  return data.results
}

export async function getDocument(documentId: string): Promise<Document> {
  return apiRequest<Document>(`/documents/${documentId}`)
}

export async function createDocumentUploadUrl(
  workspaceId: string,
  body: UploadUrlRequest,
): Promise<UploadUrlResponse> {
  return apiRequest<UploadUrlResponse>(
    `/workspaces/${workspaceId}/documents/upload-url`,
    { method: 'POST', body },
  )
}

export async function registerDocument(
  workspaceId: string,
  body: DocumentCreate,
): Promise<Document> {
  return apiRequest<Document>(`/workspaces/${workspaceId}/documents`, {
    method: 'POST',
    body,
  })
}

export async function deleteDocument(documentId: string): Promise<void> {
  return apiRequest<void>(`/documents/${documentId}`, { method: 'DELETE' })
}

export async function retrieveChunks(
  workspaceId: string,
  body: RetrieveRequest,
): Promise<RetrieveResponse> {
  return apiRequest<RetrieveResponse>(`/workspaces/${workspaceId}/retrieve`, {
    method: 'POST',
    body,
  })
}
