import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { useAutosaveNote } from '@/features/notes/use-autosave-note'

const mutateAsync = vi.fn().mockResolvedValue({ id: 'n1' })

vi.mock('@/features/notes/queries', () => ({
  useUpdateNote: () => ({
    mutateAsync,
  }),
}))

describe('useAutosaveNote', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mutateAsync.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces PATCH payload', async () => {
    const { result } = renderHook(() =>
      useAutosaveNote({
        noteId: 'n1',
        workspaceId: 'ws1',
        debounceMs: 2000,
      }),
    )

    act(() => {
      result.current.scheduleSave({ title: 'Hello' })
    })

    expect(mutateAsync).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(mutateAsync).toHaveBeenCalledWith({ title: 'Hello' })
    expect(result.current.status).toBe('saved')
  })
})
