import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { usePlanGenerationStore } from '@/features/ai-plan/plan-generation-store'
import { AIFeedbackButtons } from '@/features/feedback/AIFeedbackButtons'
import { Button } from '@/shared/ui/button'

export function PlanAdjustmentsBanner() {
  const { t } = useTranslation('aiPlan')
  const adjustments = usePlanGenerationStore((s) => s.adjustments)
  const planVersionId = usePlanGenerationStore((s) => s.lastPlanVersionId)
  const setAdjustments = usePlanGenerationStore((s) => s.setAdjustments)

  if (!adjustments?.length) return null

  return (
    <div
      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm"
      role="status"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{t('adjustments.title')}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            {adjustments.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {planVersionId ? (
            <AIFeedbackButtons
              targetType="plan_version"
              targetId={planVersionId}
              className="mt-3"
            />
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setAdjustments(null)}
          aria-label={t('adjustments.dismiss')}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
