import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PlanAdjustmentsBanner } from '@/features/ai-plan/PlanAdjustmentsBanner'
import { PlanGenerateDialog } from '@/features/ai-plan/PlanGenerateDialog'
import { usePlanGenerationStore } from '@/features/ai-plan/plan-generation-store'
import { PlannerCalendar } from '@/features/planner/PlannerCalendar'
import { PlanVersionsPanel } from '@/features/planner/PlanVersionsPanel'
import { useAuthStore } from '@/features/auth/auth-store'
import { useWorkspaceStore } from '@/features/workspace/workspace-store'

export function PlannerPage() {
  const { t } = useTranslation('planner')
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const timeZone = useAuthStore((s) => s.user?.timezone ?? 'UTC')
  const [weekRange, setWeekRange] = useState<{ start: Date; end: Date } | null>(null)
  const [generateOpen, setGenerateOpen] = useState(false)
  const isGenerating = usePlanGenerationStore((s) => s.isGenerating)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>

      <PlanAdjustmentsBanner />

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <PlannerCalendar
          isGenerating={isGenerating}
          onGenerateClick={() => setGenerateOpen(true)}
          onRangeChange={(start, end) => setWeekRange({ start, end })}
        />
        {workspaceId && weekRange ? (
          <PlanVersionsPanel
            workspaceId={workspaceId}
            rangeStart={weekRange.start}
            rangeEnd={weekRange.end}
            timeZone={timeZone}
          />
        ) : null}
      </div>

      {workspaceId && weekRange ? (
        <PlanGenerateDialog
          open={generateOpen}
          onOpenChange={setGenerateOpen}
          workspaceId={workspaceId}
          rangeStart={weekRange.start}
          rangeEnd={weekRange.end}
          timeZone={timeZone}
        />
      ) : null}
    </div>
  )
}
