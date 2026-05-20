import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/auth-store'
import { ChatPanel } from '@/features/chat/ChatPanel'
import { NoteEditor } from '@/features/notes/NoteEditor'
import { NotesSidebar } from '@/features/notes/NotesSidebar'
import { useAutosaveNote } from '@/features/notes/use-autosave-note'
import { useCreateNote, useNote, useNotesList } from '@/features/notes/queries'
import { migrateNoteContent } from '@/features/notes/tiptap-to-markdown'
import { useWorkspaceStore } from '@/features/workspace/workspace-store'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { cn } from '@/shared/lib/utils'

type MobilePanel = 'list' | 'editor' | 'chat'

export function NotesPage() {
  const { t } = useTranslation('notes')
  const { workspaceId, noteId } = useParams<{ workspaceId: string; noteId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId)

  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState(
    () => searchParams.get('subject_id') ?? '',
  )
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(noteId ? 'editor' : 'list')
  const debouncedSearch = useDebouncedValue(search, 300)

  const createMutation = useCreateNote(workspaceId ?? null)
  const notesQuery = useNotesList(workspaceId ?? null, {
    q: debouncedSearch || undefined,
    subject_id: subjectFilter || undefined,
  })
  const noteQuery = useNote(noteId ?? null)

  const { status: saveStatus, scheduleSave, flush } = useAutosaveNote({
    noteId: noteId ?? null,
    workspaceId: workspaceId ?? null,
  })

  const handleAppendToNote = (markdown: string) => {
    if (!note) return
    const base = migrateNoteContent(note.content_markdown, note.content_json).trim()
    const block = markdown.trim()
    const next = base ? `${base}\n\n---\n\n${block}` : block
    scheduleSave({ content_markdown: next })
    void flush()
  }

  useEffect(() => {
    if (workspaceId) setActiveWorkspaceId(workspaceId)
  }, [workspaceId, setActiveWorkspaceId])

  useEffect(() => {
    if (noteId || notesQuery.isLoading || !workspaceId) return
    const first = notesQuery.data?.[0]
    if (first) {
      navigate(`/w/${workspaceId}/notes/${first.id}`, { replace: true })
    }
  }, [noteId, notesQuery.data, notesQuery.isLoading, navigate, workspaceId])

  if (!workspaceId) {
    return <Navigate to="/dashboard" replace />
  }

  const handleCreateNote = async () => {
    const note = await createMutation.mutateAsync({
      title: t('list.untitled'),
      subject_id: subjectFilter || undefined,
      content_markdown: '',
    })
    navigate(`/w/${workspaceId}/notes/${note.id}`)
    setMobilePanel('editor')
  }

  const note = noteQuery.data

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col pb-[env(safe-area-inset-bottom)]">
      <div className="flex gap-2 border-b p-2 md:hidden">
        {(['list', 'editor', 'chat'] as const).map((panel) => (
          <Button
            key={panel}
            type="button"
            size="sm"
            variant={mobilePanel === panel ? 'default' : 'outline'}
            onClick={() => setMobilePanel(panel)}
          >
            {t(`mobile.${panel}`)}
          </Button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 md:grid-cols-[auto_1fr_320px]">
        <div
          className={cn(
            'min-h-0',
            mobilePanel === 'list' ? 'flex' : 'hidden md:flex',
          )}
        >
          <NotesSidebar
            workspaceId={workspaceId}
            activeNoteId={noteId}
            search={search}
            onSearchChange={setSearch}
            subjectId={subjectFilter}
            onSubjectIdChange={setSubjectFilter}
            onCreateNote={() => void handleCreateNote()}
            isCreating={createMutation.isPending}
            locale={user?.locale ?? 'tr'}
          />
        </div>

        <section
          className={cn(
            'min-h-0 min-w-0 border-r',
            mobilePanel === 'editor' ? 'flex flex-col' : 'hidden md:flex md:flex-col',
          )}
        >
          {noteQuery.isLoading && noteId ? (
            <Skeleton className="m-4 h-full" />
          ) : null}

          {!noteId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-muted-foreground">{t('empty.selectOrCreate')}</p>
              <Button type="button" onClick={() => void handleCreateNote()}>
                {t('list.newNote')}
              </Button>
            </div>
          ) : null}

          {note && noteId ? (
            <NoteEditor
              key={note.id}
              note={note}
              saveStatus={saveStatus}
              onTitleChange={(title) => scheduleSave({ title })}
              onContentChange={(content_markdown) =>
                scheduleSave({ content_markdown })
              }
            />
          ) : null}
        </section>

        <div
          className={cn(
            'min-h-0',
            mobilePanel === 'chat' ? 'flex' : 'hidden md:flex',
          )}
        >
          <ChatPanel
            workspaceId={workspaceId}
            noteId={noteId}
            subjectId={(note?.subject_id ?? subjectFilter) || undefined}
            onAppendToNote={noteId ? handleAppendToNote : undefined}
          />
        </div>
      </div>
    </div>
  )
}
