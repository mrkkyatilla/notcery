import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventDropArg,
} from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import enLocale from '@fullcalendar/core/locales/en-gb'
import trLocale from '@fullcalendar/core/locales/tr'
import interactionPlugin from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/features/auth/auth-store'
import { toApiDateTime } from '@/features/planner/datetime'
import { EventCreateDialog } from '@/features/planner/EventCreateDialog'
import { EventDetailDialog } from '@/features/planner/EventDetailDialog'
import {
  studyEventToCalendarEvent,
  subjectColorMap,
} from '@/features/planner/event-mappers'
import { useStudyEvents, useUpdateStudyEvent } from '@/features/planner/queries'
import type { StudyEvent } from '@/features/planner/types'
import { listSubjects } from '@/features/workspace/workspace-api'
import { useWorkspaceStore } from '@/features/workspace/workspace-store'
import { useDebouncedCallback } from '@/shared/hooks/use-debounced-callback'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { useQuery } from '@tanstack/react-query'

type ViewType = 'timeGridWeek' | 'timeGridDay'

type Props = {
  onRangeChange?: (start: Date, end: Date) => void
  onGenerateClick?: () => void
  isGenerating?: boolean
}

export function PlannerCalendar({ onRangeChange, onGenerateClick, isGenerating }: Props) {
  const { t, i18n } = useTranslation('planner')
  const user = useAuthStore((s) => s.user)
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const calendarRef = useRef<FullCalendar>(null)
  const timeZone = user?.timezone ?? 'UTC'

  const [view, setView] = useState<ViewType>('timeGridWeek')
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<StudyEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createSlot, setCreateSlot] = useState<{ start: Date; end: Date } | null>(null)

  const subjectsQuery = useQuery({
    queryKey: ['subjects', workspaceId],
    queryFn: () => listSubjects(workspaceId!),
    enabled: Boolean(workspaceId),
  })

  const eventsQuery = useStudyEvents(workspaceId, range?.from ?? null, range?.to ?? null)
  const updateMutation = useUpdateStudyEvent(workspaceId, range ?? { from: '', to: '' })

  const colors = useMemo(
    () => subjectColorMap(subjectsQuery.data ?? []),
    [subjectsQuery.data],
  )

  const calendarEvents = useMemo(
    () => (eventsQuery.data ?? []).map((e) => studyEventToCalendarEvent(e, colors)),
    [eventsQuery.data, colors],
  )

  const debouncedPatch = useDebouncedCallback(
    (eventId: string, start: Date, end: Date) => {
      if (!range) return
      void updateMutation.mutateAsync({
        eventId,
        body: {
          start_at: toApiDateTime(start, timeZone),
          end_at: toApiDateTime(end, timeZone),
        },
      })
    },
    500,
  )

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const from = toApiDateTime(arg.start, timeZone)
      const to = toApiDateTime(arg.end, timeZone)
      setRange({ from, to })
      onRangeChange?.(arg.start, arg.end)
    },
    [onRangeChange, timeZone],
  )

  const handleEventClick = (info: EventClickArg) => {
    const studyEvent = info.event.extendedProps.studyEvent as StudyEvent
    setSelectedEvent(studyEvent)
    setDetailOpen(true)
  }

  const handleSelect = (info: DateSelectArg) => {
    setCreateSlot({ start: info.start, end: info.end })
    setCreateOpen(true)
  }

  const handleEventDrop = (info: EventDropArg) => {
    if (!info.event.start || !info.event.end) {
      info.revert()
      return
    }
    debouncedPatch(info.event.id, info.event.start, info.event.end)
  }

  const handleEventResize = (info: EventResizeDoneArg) => {
    if (!info.event.start || !info.event.end) {
      info.revert()
      return
    }
    debouncedPatch(info.event.id, info.event.start, info.event.end)
  }

  const goPrev = () => calendarRef.current?.getApi().prev()
  const goNext = () => calendarRef.current?.getApi().next()
  const goToday = () => calendarRef.current?.getApi().today()

  if (!workspaceId) {
    return (
      <p className="text-center text-muted-foreground">{t('empty.noWorkspace')}</p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goPrev}
          aria-label={t('nav.prev')}
        >
          <span aria-hidden>←</span>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={goToday}>
          {t('nav.today')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goNext}
          aria-label={t('nav.next')}
        >
          <span aria-hidden>→</span>
        </Button>
        <Button
          type="button"
          variant={view === 'timeGridWeek' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setView('timeGridWeek')
            calendarRef.current?.getApi().changeView('timeGridWeek')
          }}
        >
          {t('views.week')}
        </Button>
        <Button
          type="button"
          variant={view === 'timeGridDay' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setView('timeGridDay')
            calendarRef.current?.getApi().changeView('timeGridDay')
          }}
        >
          {t('views.day')}
        </Button>
        <span className="text-xs text-muted-foreground">{timeZone}</span>
        {onGenerateClick ? (
          <Button type="button" size="sm" onClick={onGenerateClick} disabled={isGenerating}>
            {isGenerating ? t('ai.generating') : t('ai.generate')}
          </Button>
        ) : null}
      </div>

      {eventsQuery.isLoading ? <Skeleton className="h-[600px] w-full" /> : null}

      {!eventsQuery.isLoading && !isGenerating && calendarEvents.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t('empty.noEvents')}
        </p>
      ) : null}

      {!eventsQuery.isLoading ? (
      <div className="relative planner-calendar rounded-lg border bg-card p-2">
        {isGenerating ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-[1px]">
            <p className="text-sm font-medium text-muted-foreground animate-pulse">{t('ai.overlay')}</p>
          </div>
        ) : null}
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView={view}
          headerToolbar={false}
          locales={[trLocale, enLocale]}
          locale={i18n.language.startsWith('en') ? 'en-gb' : 'tr'}
          timeZone={timeZone}
          height="auto"
          allDaySlot={false}
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          editable
          selectable
          selectMirror
          events={calendarEvents}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          select={handleSelect}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          key={`${workspaceId}-${timeZone}-${i18n.language}`}
        />
      </div>
      ) : null}

      <EventDetailDialog
        event={selectedEvent}
        subjects={subjectsQuery.data ?? []}
        timeZone={timeZone}
        range={range ?? { from: '', to: '' }}
        workspaceId={workspaceId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {createSlot ? (
        <EventCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          workspaceId={workspaceId}
          subjects={subjectsQuery.data ?? []}
          timeZone={timeZone}
          start={createSlot.start}
          end={createSlot.end}
        />
      ) : null}
    </div>
  )
}
