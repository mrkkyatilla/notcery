import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { toApiDate } from '@/features/planner/datetime'
import {
  getActivePlan,
  listSavedPlans,
} from '@/features/planner/plan-versions-store'
import { useActivatePlan, useSavePlan } from '@/features/planner/queries'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

type Props = {
  workspaceId: string
  rangeStart: Date
  rangeEnd: Date
  timeZone: string
}

export function PlanVersionsPanel({
  workspaceId,
  rangeStart,
  rangeEnd,
  timeZone,
}: Props) {
  const { t } = useTranslation('planner')
  const queryClient = useQueryClient()
  const [, setTick] = useState(0)
  const saveMutation = useSavePlan(workspaceId)
  const activateMutation = useActivatePlan(workspaceId)

  const plans = listSavedPlans(workspaceId)
  const active = getActivePlan(workspaceId)

  const refresh = () => {
    setTick((n) => n + 1)
    void queryClient.invalidateQueries({ queryKey: ['planner-events', workspaceId] })
  }

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      range_start: toApiDate(rangeStart, timeZone),
      range_end: toApiDate(rangeEnd, timeZone),
      link_events: true,
    })
    refresh()
    toast.success(t('plans.saved'))
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('plans.title')}</CardTitle>
        <CardDescription>
          {active ? t('plans.active', { id: active.id.slice(0, 8) }) : t('plans.noActive')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={saveMutation.isPending}
          onClick={() => void handleSave()}
        >
          {t('plans.saveWeek')}
        </Button>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('plans.empty')}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {plans.map((plan) => (
              <li
                key={plan.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <span>
                  {plan.range_start} → {plan.range_end}
                  {plan.is_active ? ` (${t('plans.badge')})` : ''}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={activateMutation.isPending || plan.is_active}
                  onClick={async () => {
                    await activateMutation.mutateAsync(plan.id)
                    refresh()
                    toast.success(t('plans.activated'))
                  }}
                >
                  {t('plans.activate')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
