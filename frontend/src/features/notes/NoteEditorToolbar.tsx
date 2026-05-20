import { useTranslation } from 'react-i18next'

import {
  insertSnippet,
  MARKDOWN_SNIPPETS,
  type MarkdownSnippetId,
} from '@/features/notes/markdown-snippets'
import { Button } from '@/shared/ui/button'

const SNIPPET_IDS: MarkdownSnippetId[] = [
  'table',
  'checklist',
  'callout',
  'mermaid',
  'details',
  'math',
]

type Props = {
  onInsert: (value: string, cursor: number) => void
  getCursor: () => number
  getValue: () => string
}

export function NoteEditorToolbar({ onInsert, getCursor, getValue }: Props) {
  const { t } = useTranslation('notes')

  const handleSnippet = (id: MarkdownSnippetId) => {
    const { value, cursor } = insertSnippet(getValue(), getCursor(), MARKDOWN_SNIPPETS[id])
    onInsert(value, cursor)
  }

  return (
    <div className="flex flex-wrap gap-1 border-b px-2 py-1.5">
      {SNIPPET_IDS.map((id) => (
        <Button
          key={id}
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => handleSnippet(id)}
        >
          {t(`toolbar.snippets.${id}`)}
        </Button>
      ))}
    </div>
  )
}
