import type { Content } from '@tiptap/core'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { common, createLowlight } from 'lowlight'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { normalizeContentJson } from '@/features/notes/tiptap-document'
import type { Note } from '@/features/notes/types'
import { SaveStatus } from '@/features/notes/SaveStatus'
import type { SaveStatus as SaveStatusType } from '@/features/notes/types'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { cn } from '@/shared/lib/utils'

const lowlight = createLowlight(common)

type Props = {
  note: Note
  saveStatus: SaveStatusType
  onTitleChange: (title: string) => void
  onContentChange: (content: Record<string, unknown>) => void
}

export function NoteEditor({ note, saveStatus, onTitleChange, onContentChange }: Props) {
  const { t } = useTranslation('notes')

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          heading: { levels: [1, 2, 3] },
        }),
        Placeholder.configure({
          placeholder: t('editor.placeholder'),
        }),
        CodeBlockLowlight.configure({
          lowlight,
          HTMLAttributes: {
            class: 'rounded-md bg-muted p-3 font-mono text-sm',
          },
        }),
      ],
      content: normalizeContentJson(note.content_json) as Content,
      editorProps: {
        attributes: {
          class: 'note-editor-content min-h-[280px] px-4 py-3 focus:outline-none',
        },
      },
      onUpdate: ({ editor: ed }) => {
        onContentChange(ed.getJSON() as Record<string, unknown>)
      },
    },
    [note.id],
  )

  useEffect(() => {
    if (!editor) return
    const incoming = normalizeContentJson(note.content_json) as Content
    const current = editor.getJSON()
    if (JSON.stringify(current) !== JSON.stringify(incoming)) {
      editor.commands.setContent(incoming, { emitUpdate: false })
    }
  }, [editor, note.content_json, note.id])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
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

      <div className="flex flex-wrap gap-1 border-b px-2 py-1">
        <ToolbarButton
          label={t('toolbar.bold')}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive('bold')}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          label={t('toolbar.italic')}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive('italic')}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          label={t('toolbar.bulletList')}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive('bulletList')}
        >
          •
        </ToolbarButton>
        <ToolbarButton
          label={t('toolbar.code')}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          active={editor?.isActive('codeBlock')}
        >
          {'</>'}
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  )
}

function ToolbarButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'rounded px-2 py-1 text-sm font-medium hover:bg-accent',
        active && 'bg-accent text-accent-foreground',
      )}
    >
      {children}
    </button>
  )
}

