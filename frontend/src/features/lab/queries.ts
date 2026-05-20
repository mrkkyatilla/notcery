import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createLabFolder,
  createLabSession,
  createLabUploadUrl,
  deleteLabFile,
  getLabFileContent,
  updateLabFile,
  listLabFiles,
  listLabFolders,
  listLabMessages,
  registerLabFile,
  sendLabMessage,
  updateLabSession,
} from '@/features/lab/lab-api'
import {
  clearLabSession,
  loadLabSession,
  saveLabSession,
} from '@/features/lab/lab-session-storage'
import { uploadToPresignedUrl } from '@/features/library/upload-to-presigned'
import type {
  LabFileCreate,
  LabMessage,
  LabMessageCreate,
  LabOutputMode,
  UploadUrlRequest,
} from '@/features/lab/types'
import { showApiError } from '@/shared/api/show-api-error'

export function labFoldersKey(workspaceId: string) {
  return ['lab-folders', workspaceId] as const
}

export function labFilesKey(workspaceId: string, folderId?: string) {
  return ['lab-files', workspaceId, folderId ?? 'all'] as const
}

export function labArtifactsKey(workspaceId: string, sessionId: string) {
  return ['lab-artifacts', workspaceId, sessionId] as const
}

export function labSessionKey(workspaceId: string) {
  return ['lab-session', workspaceId] as const
}

export function labMessagesKey(sessionId: string) {
  return ['lab-messages', sessionId] as const
}

function isProcessing(status: string | undefined) {
  return status === 'pending' || status === 'processing'
}

export function useLabFolders(workspaceId: string | null) {
  return useQuery({
    queryKey: labFoldersKey(workspaceId ?? ''),
    queryFn: () => listLabFolders(workspaceId!),
    enabled: Boolean(workspaceId),
  })
}

export function useLabFiles(workspaceId: string | null, folderId?: string | null) {
  return useQuery({
    queryKey: labFilesKey(workspaceId ?? '', folderId ?? undefined),
    queryFn: () =>
      listLabFiles(workspaceId!, folderId ? { folder_id: folderId } : undefined),
    enabled: Boolean(workspaceId),
    refetchInterval: (query) => {
      const files = query.state.data
      if (!files?.some((f) => isProcessing(f.index_status))) return false
      return 5000
    },
  })
}

export function useLabArtifacts(workspaceId: string | null, sessionId: string | undefined) {
  return useQuery({
    queryKey: labArtifactsKey(workspaceId ?? '', sessionId ?? ''),
    queryFn: () =>
      listLabFiles(workspaceId!, { kind: 'artifact', session_id: sessionId! }),
    enabled: Boolean(workspaceId && sessionId),
    refetchInterval: 8000,
  })
}

export function useLabSession(workspaceId: string) {
  return useQuery({
    queryKey: labSessionKey(workspaceId),
    queryFn: async () => {
      const cached = loadLabSession(workspaceId)
      if (cached?.id) return cached
      const created = await createLabSession(workspaceId)
      saveLabSession(workspaceId, created)
      return created
    },
    staleTime: Infinity,
  })
}

export function useLabMessages(sessionId: string | undefined) {
  return useQuery({
    queryKey: labMessagesKey(sessionId ?? ''),
    queryFn: () => listLabMessages(sessionId!),
    enabled: Boolean(sessionId),
  })
}

export function useCreateLabFolder(workspaceId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; parent_id?: string | null }) =>
      createLabFolder(workspaceId!, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labFoldersKey(workspaceId ?? '') })
    },
    onError: showApiError,
  })
}

export function useUploadLabFile(workspaceId: string | null, folderId?: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const uploadReq: UploadUrlRequest = {
        filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        folder_id: folderId ?? undefined,
      }
      const presign = await createLabUploadUrl(workspaceId!, uploadReq)
      await uploadToPresignedUrl(presign.upload_url, file, file.type || 'application/octet-stream')
      const createBody: LabFileCreate = {
        file_key: presign.file_key,
        original_filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        folder_id: folderId ?? undefined,
      }
      return registerLabFile(workspaceId!, createBody)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab-files', workspaceId] })
    },
    onError: showApiError,
  })
}

export function useDeleteLabFile(workspaceId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fileId: string) => deleteLabFile(fileId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab-files', workspaceId] })
    },
    onError: showApiError,
  })
}

export function useUpdateLabFile(workspaceId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      fileId,
      ...body
    }: {
      fileId: string
      name?: string
      folder_id?: string | null
    }) => updateLabFile(fileId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab-files', workspaceId] })
      void qc.invalidateQueries({ queryKey: labFoldersKey(workspaceId ?? '') })
    },
    onError: showApiError,
  })
}

export function useLabFileContent(fileId: string | undefined) {
  return useQuery({
    queryKey: ['lab-file-content', fileId],
    queryFn: () => getLabFileContent(fileId!),
    enabled: Boolean(fileId),
  })
}

export type LabAgentContext = {
  useRag: boolean
  outputMode: LabOutputMode
  activeFileIds: string[]
}

export function useSendLabMessage(
  workspaceId: string,
  sessionId: string | undefined,
  ctx: LabAgentContext,
) {
  const qc = useQueryClient()
  const messagesKey = labMessagesKey(sessionId ?? '')

  return useMutation({
    mutationFn: (content: string) => {
      const body: LabMessageCreate = {
        content,
        context: {
          use_rag: ctx.useRag,
          output_mode: ctx.outputMode,
          active_file_ids: ctx.activeFileIds.length ? ctx.activeFileIds : undefined,
        },
      }
      return sendLabMessage(sessionId!, body)
    },
    onMutate: async (content) => {
      await qc.cancelQueries({ queryKey: messagesKey })
      const previous = qc.getQueryData<LabMessage[]>(messagesKey) ?? []
      const optimistic: LabMessage = {
        id: `optimistic-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      }
      qc.setQueryData<LabMessage[]>(messagesKey, [...previous, optimistic])
      return { previous }
    },
    onSuccess: (response, content, ctxState) => {
      const base = ctxState?.previous ?? []
      const userMsg: LabMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      }
      const assistant: LabMessage = {
        id: response.message?.id ?? `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message?.content ?? '',
        citations: response.citations,
        structured_result: response.structured_result,
        created_at: new Date().toISOString(),
      }
      qc.setQueryData<LabMessage[]>(messagesKey, [...base, userMsg, assistant])
      void qc.invalidateQueries({ queryKey: labArtifactsKey(workspaceId, sessionId ?? '') })
      void qc.invalidateQueries({ queryKey: ['lab-files', workspaceId] })
      void qc.invalidateQueries({ queryKey: ['billing', 'me'] })
    },
    onError: (error, _content, ctxState) => {
      if (ctxState?.previous) {
        qc.setQueryData(messagesKey, ctxState.previous)
      }
      showApiError(error)
    },
  })
}

export function useUpdateLabSessionFocus(workspaceId: string, sessionId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (activeFileIds: string[]) =>
      updateLabSession(sessionId!, { active_file_ids: activeFileIds }),
    onSuccess: (session) => {
      saveLabSession(workspaceId, session)
      qc.setQueryData(labSessionKey(workspaceId), session)
    },
  })
}

export function useResetLabSession(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      clearLabSession(workspaceId)
      return createLabSession(workspaceId)
    },
    onSuccess: (session) => {
      saveLabSession(workspaceId, session)
      qc.setQueryData(labSessionKey(workspaceId), session)
      qc.removeQueries({ queryKey: labMessagesKey(session.id) })
    },
  })
}
