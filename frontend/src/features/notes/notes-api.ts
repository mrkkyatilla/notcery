import { apiRequest } from '@/shared/api/client'

import type {
  Note,
  NoteCreate,
  NoteSummary,
  NoteUpdate,
  TipTapDocument,
} from '@/features/notes/types'

export type NoteCreateBody = NoteCreate & {
  content_json?: TipTapDocument
  content_markdown?: string
}

type ListResponse<T> = { results: T[] }

export type ListNotesParams = {
  q?: string
  subject_id?: string
}

export async function listNotes(
  workspaceId: string,
  params: ListNotesParams = {},
): Promise<NoteSummary[]> {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.subject_id) search.set('subject_id', params.subject_id)
  const qs = search.toString()
  const path = `/workspaces/${workspaceId}/notes${qs ? `?${qs}` : ''}`
  const data = await apiRequest<ListResponse<NoteSummary>>(path)
  return data.results
}

export async function getNote(noteId: string): Promise<Note> {
  return apiRequest<Note>(`/notes/${noteId}`)
}

export async function createNote(workspaceId: string, body: NoteCreateBody): Promise<Note> {
  return apiRequest<Note>(`/workspaces/${workspaceId}/notes`, {
    method: 'POST',
    body,
  })
}

export async function updateNote(noteId: string, body: NoteUpdate): Promise<Note> {
  return apiRequest<Note>(`/notes/${noteId}`, {
    method: 'PATCH',
    body,
  })
}

export async function deleteNote(noteId: string): Promise<void> {
  return apiRequest<void>(`/notes/${noteId}`, { method: 'DELETE' })
}
