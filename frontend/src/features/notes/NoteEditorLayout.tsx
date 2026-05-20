import { useTranslation } from 'react-i18next'

import {
  NoteMarkdownEditor,
  type NoteMarkdownEditorHandle,
} from '@/features/notes/NoteMarkdownEditor'
import { MarkdownView } from '@/shared/markdown/MarkdownView'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

export type EditorViewMode = 'edit' | 'preview' | 'split'

type Props = {
  markdown: string
  noteId: string
  viewMode: EditorViewMode
  onViewModeChange: (mode: EditorViewMode) => void
  onMarkdownChange: (value: string) => void
  previewMarkdown: string
  editorRef: React.RefObject<NoteMarkdownEditorHandle | null>
  toolbar: React.ReactNode
  isMobile: boolean
}

export function NoteEditorLayout({
  markdown,
  noteId,
  viewMode,
  onViewModeChange,
  onMarkdownChange,
  previewMarkdown,
  editorRef,
  toolbar,
  isMobile,
}: Props) {
  const { t } = useTranslation('notes')

  const showEdit = viewMode === 'edit' || viewMode === 'split'
  const showPreview = viewMode === 'preview' || viewMode === 'split'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
        {isMobile ? (
          <>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'edit' ? 'default' : 'outline'}
              onClick={() => onViewModeChange('edit')}
            >
              {t('editor.mode.edit')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'preview' ? 'default' : 'outline'}
              onClick={() => onViewModeChange('preview')}
            >
              {t('editor.mode.preview')}
            </Button>
          </>
        ) : (
          (['edit', 'split', 'preview'] as const).map((mode) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={viewMode === mode ? 'default' : 'outline'}
              onClick={() => onViewModeChange(mode)}
            >
              {t(`editor.mode.${mode}`)}
            </Button>
          ))
        )}
      </div>

      {showEdit ? toolbar : null}

      <div
        className={cn(
          'grid min-h-0 flex-1',
          viewMode === 'split' && !isMobile && 'md:grid-cols-2',
        )}
      >
        {showEdit ? (
          <div
            className={cn(
              'flex min-h-0 flex-col border-border',
              viewMode === 'split' && !isMobile && 'border-r',
              !showPreview && 'flex-1',
            )}
          >
            <NoteMarkdownEditor
              ref={editorRef}
              value={markdown}
              onChange={onMarkdownChange}
              noteId={noteId}
            />
          </div>
        ) : null}

        {showPreview ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <MarkdownView content={previewMarkdown} variant="note" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
