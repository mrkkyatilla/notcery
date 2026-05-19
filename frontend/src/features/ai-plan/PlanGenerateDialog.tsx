import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  useGeneratePlan,
  usePlanTaskPoll,
  useRetryPlanTask,
} from '@/features/ai-plan/queries'
import { usePlanGenerationStore } from '@/features/ai-plan/plan-generation-store'
import type { PlanTaskResult } from '@/features/ai-plan/types'
import { activatePlanVersion } from '@/features/planner/planner-api'
import { toApiDate } from '@/features/planner/datetime'
import { useBillingMe } from '@/features/billing/queries'
import { planQuotaRemaining } from '@/features/billing/quota-helpers'
import { createBillingCheckout } from '@/features/billing/billing-api'
import { Dialog } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { showApiError } from '@/shared/api/show-api-error'
import { useQueryClient } from '@tanstack/react-query'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  rangeStart: Date
  rangeEnd: Date
  timeZone: string
}

export function PlanGenerateDialog({
  open,
  onOpenChange,
  workspaceId,
  rangeStart,
  rangeEnd,
  timeZone,
}: Props) {
  const { t } = useTranslation('aiPlan')
  const queryClient = useQueryClient()
  const billing = useBillingMe()
  const planQuota = planQuotaRemaining(billing.data)

  const taskId = usePlanGenerationStore((s) => s.taskId)
  const setGenerating = usePlanGenerationStore((s) => s.setGenerating)
  const setAdjustments = usePlanGenerationStore((s) => s.setAdjustments)
  const setLastPlanVersionId = usePlanGenerationStore((s) => s.setLastPlanVersionId)

  const [useRag, setUseRag] = useState(true)
  const [maxHours, setMaxHours] = useState('')

  const generateMutation = useGeneratePlan(workspaceId)
  const retryMutation = useRetryPlanTask()
  const { data: task, phase } = usePlanTaskPoll(taskId, open && Boolean(taskId))

  const polling = phase === 'polling' || generateMutation.isPending
  const failed = phase === 'failed'
  const finishedRef = useRef(false)

  useEffect(() => {
    if (phase !== 'success' || !task?.result || finishedRef.current) return
    finishedRef.current = true

    const finish = async (result: PlanTaskResult | null | undefined) => {
      if (result?.plan_version_id) {
        setLastPlanVersionId(result.plan_version_id)
        try {
          await activatePlanVersion(result.plan_version_id)
        } catch {
          // still refresh events
        }
      }
      if (result?.adjustments?.length) {
        setAdjustments(result.adjustments)
      }
      await queryClient.invalidateQueries({ queryKey: ['planner-events', workspaceId] })
      setGenerating(false, null)
      toast.success(t('success'))
      onOpenChange(false)
    }

    void finish(task.result as PlanTaskResult)
  }, [
    phase,
    task,
    queryClient,
    workspaceId,
    setAdjustments,
    setLastPlanVersionId,
    setGenerating,
    onOpenChange,
    t,
  ])

  useEffect(() => {
    if (!open) finishedRef.current = false
  }, [open])

  const handleSubmit = () => {
    const constraints =
      maxHours.trim() !== ''
        ? { max_hours_per_day: Number(maxHours) }
        : undefined

    void generateMutation.mutateAsync({
      range_start: toApiDate(rangeStart, timeZone),
      range_end: toApiDate(rangeEnd, timeZone),
      use_rag: useRag,
      constraints,
    })
  }

  const handleUpgrade = async () => {
    try {
      const session = await createBillingCheckout()
      if (session.checkout_url) window.location.href = session.checkout_url
    } catch (error) {
      showApiError(error)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!polling) onOpenChange(next)
      }}
      title={t('title')}
      description={t('description')}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('range', {
            start: toApiDate(rangeStart, timeZone),
            end: toApiDate(rangeEnd, timeZone),
          })}
        </p>

        {planQuota.limit != null ? (
          <p className="rounded-md bg-muted px-3 py-2 text-xs">
            {t('quota', {
              used: planQuota.used,
              limit: planQuota.limit,
            })}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="max-hours">{t('maxHours')}</Label>
          <Input
            id="max-hours"
            type="number"
            min={1}
            max={16}
            step={0.5}
            placeholder={t('maxHoursPlaceholder')}
            value={maxHours}
            onChange={(e) => setMaxHours(e.target.value)}
            disabled={polling}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useRag}
            onChange={(e) => setUseRag(e.target.checked)}
            disabled={polling}
          />
          {t('useRag')}
        </label>

        {polling ? (
          <p className="text-sm text-muted-foreground animate-pulse">{t('generating')}</p>
        ) : null}

        {failed ? (
          <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <p>{task?.error?.error?.message ?? t('failed')}</p>
            <div className="flex flex-wrap gap-2">
              {taskId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void retryMutation.mutateAsync(taskId)}
                >
                  {t('retry')}
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="ghost" onClick={() => void handleUpgrade()}>
                {t('upgrade')}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="outline" disabled={polling} onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button type="button" disabled={polling} onClick={handleSubmit}>
            {polling ? t('generating') : t('submit')}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
