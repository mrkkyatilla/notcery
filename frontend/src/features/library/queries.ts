import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createDocumentUploadUrl,
  deleteDocument,
  listDocuments,
  registerDocument,
  retrieveChunks,
} from '@/features/library/library-api'
import { uploadToPresignedUrl } from '@/features/library/upload-to-presigned'
import type { DocumentCreate, RetrieveRequest, UploadUrlRequest } from '@/features/library/types'
export { useBillingMe } from '@/features/billing/queries'
import { ApiError } from '@/shared/api/errors'
import { showApiError } from '@/shared/api/show-api-error'

export function documentsKey(workspaceId: string) {
  return ['documents', workspaceId] as const
}

function isProcessing(status: string | undefined) {
  return status === 'pending' || status === 'processing'
}

export function useDocuments(workspaceId: string | null) {
  return useQuery({
    queryKey: documentsKey(workspaceId ?? ''),
    queryFn: () => listDocuments(workspaceId!),
    enabled: Boolean(workspaceId),
    refetchInterval: (query) => {
      const docs = query.state.data
      if (!docs?.some((d) => isProcessing(d.status))) return false
      return 5000
    },
  })
}

export function useUploadDocument(workspaceId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      file,
      mimeType,
      subjectId,
      onProgress,
    }: {
      file: File
      mimeType: string
      subjectId?: string
      onProgress?: (percent: number) => void
    }) => {
      const uploadReq: UploadUrlRequest = {
        filename: file.name,
        mime_type: mimeType as UploadUrlRequest['mime_type'],
        size_bytes: file.size,
      }
      const presign = await createDocumentUploadUrl(workspaceId!, uploadReq)
      if (!presign.upload_url || !presign.file_key) {
        throw new Error('Invalid upload URL response')
      }
      await uploadToPresignedUrl(presign.upload_url, file, mimeType, onProgress)

      const createBody: DocumentCreate = {
        file_key: presign.file_key,
        original_filename: file.name,
        mime_type: mimeType as DocumentCreate['mime_type'],
        size_bytes: file.size,
        subject_id: subjectId,
      }
      return registerDocument(workspaceId!, createBody)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['billing', 'me'] })
    },
    onError: (error) => {
      if (error instanceof ApiError && String(error.code) === 'QUOTA_EXCEEDED') {
        showApiError(error)
        return
      }
      showApiError(error)
    },
  })
}

export function useDeleteDocument(workspaceId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['billing', 'me'] })
    },
    onError: showApiError,
  })
}

export function useRetrieveDebug(workspaceId: string | null) {
  return useMutation({
    mutationFn: (body: RetrieveRequest) => retrieveChunks(workspaceId!, body),
    onError: showApiError,
  })
}
