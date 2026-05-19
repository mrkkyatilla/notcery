import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { toApiDateTime, toDateTimeLocalValue, fromDateTimeLocalValue } from '@/features/planner/datetime'
import { EventForm } from '@/features/planner/EventForm'
import { OverlapWarningsBanner } from '@/features/planner/OverlapWarningsBanner'
import {
  useDeleteStudyEvent,
  useUpdateStudyEvent,
} from '@/features/planner/queries'
import type { EventFormValues } from '@/features/planner/schemas'
import type { EventOverlapWarning, StudyEvent } from '@/features/planner/types'
import { USER_FEEDBACKS } from '@/features/planner/types'
import type { Subject } from '@/features/workspace/workspace-api'
import { Dialog } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'

type Props = {
  event: StudyEvent | null
  subjects: Subject[]
  timeZone: string
  range: { from: string; to: string }
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EventDetailDialog({
  event,
  subjects,
  timeZone,
  range,
  workspaceId,
  open,
  onOpenChange,
}: Props) {
  const { t } = useTranslation('planner')
  const [warnings, setWarnings] = useState<EventOverlapWarning[]>([])
  const updateMutation = useUpdateStudyEvent(workspaceId, range)
  const deleteMutation = useDeleteStudyEvent(workspaceId, range)

  if (!event) return null

  const defaultValues: EventFormValues = {
    title: event.title,
    subject_id: event.subject_id ?? '',
    start_at: toDateTimeLocalValue(event.start_at, timeZone),
    end_at: toDateTimeLocalValue(event.end_at, timeZone),
    method: event.method,
    status: event.status,
    user_feedback: event.user_feedback ?? null,
  }

  const handleSubmit = async (values: EventFormValues) => {
    const response = await updateMutation.mutateAsync({
      eventId: event.id,
      body: {
        title: values.title,
        subject_id: values.subject_id || null,
        start_at: toApiDateTime(fromDateTimeLocalValue(values.start_at, timeZone), timeZone),
        end_at: toApiDateTime(fromDateTimeLocalValue(values.end_at, timeZone), timeZone),
        method: values.method,
        status: values.status,
        user_feedback: values.user_feedback ?? null,
      },
    })
    setWarnings(response.warnings ?? [])
    if (values.user_feedback === 'hard' && values.status === 'done') {
      toast.success(t('feedback.saved'))
    }
    onOpenChange(false)
  }

  const setFeedback = async (feedback: 'easy' | 'hard') => {
    const response = await updateMutation.mutateAsync({
      eventId: event.id,
      body: { user_feedback: feedback, status: 'done' },
    })
    setWarnings(response.warnings ?? [])
    toast.success(t('feedback.saved'))
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('event.detailTitle')}
      description={event.title}
    >
      <OverlapWarningsBanner warnings={warnings} />
      <div className="mb-4 flex flex-wrap gap-2">
        {USER_FEEDBACKS.map((fb) => (
          <Button
            key={fb}
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void setFeedback(fb)}
          >
            {t(`feedback.${fb}`)}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={async () => {
            await deleteMutation.mutateAsync(event.id)
            onOpenChange(false)
          }}
        >
          {t('event.delete')}
        </Button>
      </div>
      <EventForm
        subjects={subjects}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
        submitLabel={t('event.save')}
      />
    </Dialog>
  )
}
