import type { TipTapDocument } from '@/features/notes/types'

export const EMPTY_TIPTAP_DOC: TipTapDocument = {
  type: 'doc',
  content: [],
}

export function isTipTapDocument(value: unknown): value is TipTapDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as TipTapDocument).type === 'doc'
  )
}

export function normalizeContentJson(value: unknown): TipTapDocument {
  return isTipTapDocument(value) ? value : EMPTY_TIPTAP_DOC
}
