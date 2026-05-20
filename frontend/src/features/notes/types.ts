import type { components } from '@/shared/api/schema'

export type Note = components['schemas']['Note']
export type NoteSummary = components['schemas']['NoteSummary']
export type NoteCreate = components['schemas']['NoteCreate']
export type NoteUpdate = Omit<
  components['schemas']['NoteUpdate'],
  'content_json'
> & {
  content_json?: TipTapDocument | Record<string, unknown>
  content_markdown?: string
}

export type TipTapDocument = {
  type: 'doc'
  content?: unknown[]
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
