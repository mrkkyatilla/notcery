import { useCallback, useEffect, useRef, useState } from 'react'

import { useUpdateNote } from '@/features/notes/queries'
import type { NoteUpdate, SaveStatus } from '@/features/notes/types'

type Options = {
  noteId: string | null
  workspaceId: string | null
  debounceMs?: number
}

export function useAutosaveNote({
  noteId,
  workspaceId,
  debounceMs = 2000,
}: Options) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const updateMutation = useUpdateNote(noteId, workspaceId)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<NoteUpdate | null>(null)

  const flush = useCallback(async () => {
    if (!noteId || !pendingRef.current) return
    const body = pendingRef.current
    pendingRef.current = null
    setStatus('saving')
    try {
      await updateMutation.mutateAsync(body)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }, [noteId, updateMutation])

  const scheduleSave = useCallback(
    (body: NoteUpdate) => {
      pendingRef.current = { ...pendingRef.current, ...body }
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        void flush()
      }, debounceMs)
    },
    [debounceMs, flush],
  )

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  return { status, scheduleSave, flush }
}
