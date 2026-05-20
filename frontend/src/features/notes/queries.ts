import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createNote,
  deleteNote,
  getNote,
  listNotes,
  updateNote,
  type ListNotesParams,
} from '@/features/notes/notes-api'
import type { NoteCreateBody } from '@/features/notes/notes-api'
import type { NoteUpdate } from '@/features/notes/types'
import { showApiError } from '@/shared/api/show-api-error'

export function notesListKey(workspaceId: string, params: ListNotesParams) {
  return ['notes', workspaceId, params] as const
}

export function noteDetailKey(noteId: string) {
  return ['note', noteId] as const
}

export function useNotesList(workspaceId: string | null, params: ListNotesParams) {
  return useQuery({
    queryKey: notesListKey(workspaceId ?? '', params),
    queryFn: () => listNotes(workspaceId!, params),
    enabled: Boolean(workspaceId),
  })
}

export function useNote(noteId: string | null) {
  return useQuery({
    queryKey: noteDetailKey(noteId ?? ''),
    queryFn: () => getNote(noteId!),
    enabled: Boolean(noteId),
  })
}

export function useCreateNote(workspaceId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: NoteCreateBody) => createNote(workspaceId!, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes', workspaceId] })
    },
    onError: showApiError,
  })
}

export function useUpdateNote(noteId: string | null, workspaceId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: NoteUpdate) => updateNote(noteId!, body),
    onSuccess: (note) => {
      if (note.id) queryClient.setQueryData(noteDetailKey(note.id), note)
      void queryClient.invalidateQueries({ queryKey: ['notes', workspaceId] })
    },
  })
}

export function useDeleteNote(workspaceId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes', workspaceId] })
    },
    onError: showApiError,
  })
}
