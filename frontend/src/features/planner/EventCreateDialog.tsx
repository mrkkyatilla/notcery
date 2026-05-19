import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  fromDateTimeLocalValue,
  toApiDateTime,
  toDateTimeLocalValue,
} from '@/features/planner/datetime'
import { EventForm } from '@/features/planner/EventForm'
import { OverlapWarningsBanner } from '@/features/planner/OverlapWarningsBanner'
import { useCreateStudyEvent } from '@/features/planner/queries'
import type { EventFormValues } from '@/features/planner/schemas'
import type { EventOverlapWarning } from '@/features/planner/types'
import type { Subject } from '@/features/workspace/workspace-api'
import { Dialog } from '@/shared/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  subjects: Subject[]
  timeZone: string
  start: Date
  end: Date
}

export function EventCreateDialog({
  open,
  onOpenChange,
  workspaceId,
  subjects,
  timeZone,
  start,
  end,
}: Props) {
  const { t } = useTranslation('planner')
  const [warnings, setWarnings] = useState<EventOverlapWarning[]>([])
  const createMutation = useCreateStudyEvent(workspaceId)

  const defaultValues: EventFormValues = {
    title: '',
    subject_id: subjects[0]?.id ?? '',
    start_at: toDateTimeLocalValue(toApiDateTime(start, timeZone), timeZone),
    end_at: toDateTimeLocalValue(toApiDateTime(end, timeZone), timeZone),
    method: 'pomodoro',
    status: 'planned',
    user_feedback: null,
  }

  const handleSubmit = async (values: EventFormValues) => {
    const response = await createMutation.mutateAsync({
      title: values.title,
      subject_id: values.subject_id || undefined,
      start_at: toApiDateTime(fromDateTimeLocalValue(values.start_at, timeZone), timeZone),
      end_at: toApiDateTime(fromDateTimeLocalValue(values.end_at, timeZone), timeZone),
      method: values.method,
      status: values.status,
    })
    const nextWarnings = response.warnings ?? []
    setWarnings(nextWarnings)
    if (!nextWarnings.length) onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('event.createTitle')}
      description={t('event.createSubtitle')}
    >
      <OverlapWarningsBanner warnings={warnings} />
      <EventForm
        subjects={subjects}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
        submitLabel={t('event.create')}
      />
    </Dialog>
  )
}
