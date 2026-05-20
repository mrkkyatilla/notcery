import { formatDistanceToNow } from 'date-fns'
import { Plus, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { getDateFnsLocale } from '@/shared/i18n/date-fns'
import type { Locale } from '@/shared/api/locale'
import { useNotesList } from '@/features/notes/queries'
import type { NoteSummary } from '@/features/notes/types'
import { listSubjects } from '@/features/workspace/workspace-api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Skeleton } from '@/shared/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import { useQuery } from '@tanstack/react-query'

type Props = {
  workspaceId: string
  activeNoteId?: string
  search: string
  onSearchChange: (value: string) => void
  subjectId: string
  onSubjectIdChange: (value: string) => void
  onCreateNote: () => void
  isCreating?: boolean
  locale: Locale
}

export function NotesSidebar({
  workspaceId,
  activeNoteId,
  search,
  onSearchChange,
  subjectId,
  onSubjectIdChange,
  onCreateNote,
  isCreating,
  locale,
}: Props) {
  const { t } = useTranslation('notes')

  const notesQuery = useNotesList(workspaceId, {
    q: search || undefined,
    subject_id: subjectId || undefined,
  })

  const subjectsQuery = useQuery({
    queryKey: ['subjects', workspaceId],
    queryFn: () => listSubjects(workspaceId),
  })

  return (
    <aside className="flex h-full w-full flex-col border-r bg-card md:w-72 lg:w-80">
      <div className="space-y-2 border-b p-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('list.search')}
            className="pl-8"
          />
        </div>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={subjectId}
          onChange={(e) => onSubjectIdChange(e.target.value)}
        >
          <option value="">{t('list.allSubjects')}</option>
          {subjectsQuery.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          className="w-full"
          size="sm"
          onClick={onCreateNote}
          disabled={isCreating}
        >
          <Plus className="size-4" />
          {t('list.newNote')}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {notesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : null}

        {!notesQuery.isLoading && (notesQuery.data?.length ?? 0) === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">{t('list.empty')}</p>
        ) : null}

        <ul className="space-y-1">
          {notesQuery.data?.map((note) => (
            <NoteListItem
              key={note.id}
              note={note}
              workspaceId={workspaceId}
              active={note.id === activeNoteId}
              locale={locale}
            />
          ))}
        </ul>
      </nav>
    </aside>
  )
}

function NoteListItem({
  note,
  workspaceId,
  active,
  locale,
}: {
  note: NoteSummary
  workspaceId: string
  active: boolean
  locale: Locale
}) {
  const { t } = useTranslation('notes')
  const updatedLabel = note.updated_at
    ? formatDistanceToNow(new Date(note.updated_at), {
        addSuffix: true,
        locale: getDateFnsLocale(locale),
      })
    : ''

  return (
    <li>
      <Link
        to={`/w/${workspaceId}/notes/${note.id}`}
        className={cn(
          'block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
          active && 'bg-accent font-medium',
        )}
      >
        <span className="line-clamp-1">{note.title || t('list.untitled')}</span>
        {updatedLabel ? (
          <span className="mt-1 block text-xs text-muted-foreground">{updatedLabel}</span>
        ) : null}
      </Link>
    </li>
  )
}
