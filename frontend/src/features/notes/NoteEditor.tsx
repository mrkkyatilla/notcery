import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  NoteEditorLayout,
  type EditorViewMode,
} from '@/features/notes/NoteEditorLayout'
import { NoteEditorToolbar } from '@/features/notes/NoteEditorToolbar'
import type { NoteMarkdownEditorHandle } from '@/features/notes/NoteMarkdownEditor'
import { migrateNoteContent } from '@/features/notes/tiptap-to-markdown'
import type { Note } from '@/features/notes/types'
import { SaveStatus } from '@/features/notes/SaveStatus'
import type { SaveStatus as SaveStatusType } from '@/features/notes/types'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

type Props = {
  note: Note
  saveStatus: SaveStatusType
  onTitleChange: (title: string) => void
  onContentChange: (content_markdown: string) => void
}

function useMediaMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => setMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return mobile
}

export function NoteEditor({ note, saveStatus, onTitleChange, onContentChange }: Props) {
  const { t } = useTranslation('notes')
  const isMobile = useMediaMobile()
  const editorRef = useRef<NoteMarkdownEditorHandle | null>(null)
  const migratedRef = useRef<string | null>(null)

  const initialMarkdown = migrateNoteContent(note.content_markdown, note.content_json)
  const [markdown, setMarkdown] = useState(initialMarkdown)
  const [viewMode, setViewMode] = useState<EditorViewMode>(isMobile ? 'edit' : 'split')
  const previewMarkdown = useDebouncedValue(markdown, 120)

  useEffect(() => {
    const next = migrateNoteContent(note.content_markdown, note.content_json)
    setMarkdown(next)
    migratedRef.current = null
  }, [note.id, note.content_markdown, note.content_json])

  useEffect(() => {
    if (migratedRef.current === note.id) return
    const needsMigration =
      !(note.content_markdown ?? '').trim() &&
      initialMarkdown.trim().length > 0
    if (needsMigration && initialMarkdown && note.id) {
      migratedRef.current = note.id
      onContentChange(initialMarkdown)
    }
  }, [note.id, note.content_markdown, initialMarkdown, onContentChange])

  useEffect(() => {
    setViewMode(isMobile ? 'edit' : 'split')
  }, [isMobile, note.id])

  const handleMarkdownChange = useCallback(
    (value: string) => {
      setMarkdown(value)
      onContentChange(value)
    },
    [onContentChange],
  )

  const handleSnippetInsert = useCallback((value: string, cursor: number) => {
    setMarkdown(value)
    onContentChange(value)
    editorRef.current?.setValue(value, cursor)
  }, [onContentChange])

  const toolbar = (
    <NoteEditorToolbar
      getValue={() => editorRef.current?.getValue() ?? markdown}
      getCursor={() => editorRef.current?.getCursor() ?? markdown.length}
      onInsert={handleSnippetInsert}
    />
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2">
        <Label htmlFor="note-title" className="sr-only">
          {t('editor.title')}
        </Label>
        <Input
          id="note-title"
          value={note.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t('editor.titlePlaceholder')}
          className="border-0 text-lg font-semibold shadow-none focus-visible:ring-0"
        />
        <div className="flex shrink-0 items-center gap-2">
          {note.indexed_at ? (
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {t('list.indexed')}
            </span>
          ) : null}
          <SaveStatus status={saveStatus} />
        </div>
      </div>

      <NoteEditorLayout
        markdown={markdown}
        noteId={note.id ?? ''}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onMarkdownChange={handleMarkdownChange}
        previewMarkdown={previewMarkdown}
        editorRef={editorRef}
        toolbar={toolbar}
        isMobile={isMobile}
      />
    </div>
  )
}
