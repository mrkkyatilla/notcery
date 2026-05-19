import type { EventInput } from '@fullcalendar/core'

import type { Subject } from '@/features/workspace/workspace-api'
import type { StudyEvent } from '@/features/planner/types'

const DEFAULT_COLOR = '#6366f1'

export function subjectColorMap(subjects: Subject[]): Map<string, string> {
  return new Map(subjects.map((s) => [s.id, s.color || DEFAULT_COLOR]))
}

export function studyEventToCalendarEvent(
  event: StudyEvent,
  colors: Map<string, string>,
): EventInput {
  const color = event.subject_id
    ? colors.get(event.subject_id) ?? DEFAULT_COLOR
    : DEFAULT_COLOR

  return {
    id: event.id,
    title: event.title,
    start: event.start_at,
    end: event.end_at,
    backgroundColor: color,
    borderColor: color,
    extendedProps: {
      studyEvent: event,
    },
    classNames:
      event.status === 'done'
        ? ['opacity-70', 'line-through']
        : event.status === 'skipped'
          ? ['opacity-50']
          : [],
  }
}

export function stripWarnings(payload: StudyEvent & { warnings?: unknown }): StudyEvent {
  const copy = { ...payload }
  delete copy.warnings
  return copy
}
