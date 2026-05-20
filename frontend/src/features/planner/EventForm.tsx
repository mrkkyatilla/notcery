import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { eventFormSchema, type EventFormValues } from '@/features/planner/schemas'
import { STUDY_METHODS, STUDY_STATUSES } from '@/features/planner/types'
import type { Subject } from '@/features/workspace/workspace-api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select } from '@/shared/ui/select'

type Props = {
  subjects: Subject[]
  defaultValues: EventFormValues
  onSubmit: (values: EventFormValues) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

export function EventForm({
  subjects,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
}: Props) {
  const { t } = useTranslation('planner')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  })

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values)
      })}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="title">{t('event.title')}</Label>
        <Input id="title" {...register('title')} />
        {errors.title ? (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject_id">{t('event.subject')}</Label>
        <Select id="subject_id" {...register('subject_id')}>
          <option value="">{t('event.noSubject')}</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start_at">{t('event.start')}</Label>
          <Input id="start_at" type="datetime-local" {...register('start_at')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_at">{t('event.end')}</Label>
          <Input id="end_at" type="datetime-local" {...register('end_at')} />
        </div>
      </div>
      {errors.end_at?.message === 'end_after_start' ? (
        <p className="text-sm text-destructive">{t('event.endAfterStart')}</p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="method">{t('event.method')}</Label>
        <Select id="method" {...register('method')}>
          {STUDY_METHODS.map((m) => (
            <option key={m} value={m}>
              {t(`methods.${m}`)}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">{t('event.status')}</Label>
        <Select id="status" {...register('status')}>
          {STUDY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('event.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
