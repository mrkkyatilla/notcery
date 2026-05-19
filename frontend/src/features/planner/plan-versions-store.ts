import type { PlanVersion } from '@/features/planner/types'

const key = (workspaceId: string) => `notcery_plans_${workspaceId}`

export function listSavedPlans(workspaceId: string): PlanVersion[] {
  try {
    const raw = localStorage.getItem(key(workspaceId))
    if (!raw) return []
    return JSON.parse(raw) as PlanVersion[]
  } catch {
    return []
  }
}

export function addSavedPlan(workspaceId: string, plan: PlanVersion): void {
  const plans = listSavedPlans(workspaceId).filter((p) => p.id !== plan.id)
  plans.unshift(plan)
  localStorage.setItem(key(workspaceId), JSON.stringify(plans.slice(0, 20)))
}

export function markActivePlan(workspaceId: string, activeId: string): void {
  const plans = listSavedPlans(workspaceId).map((p) => ({
    ...p,
    is_active: p.id === activeId,
  }))
  localStorage.setItem(key(workspaceId), JSON.stringify(plans))
}

export function getActivePlan(workspaceId: string): PlanVersion | null {
  return listSavedPlans(workspaceId).find((p) => p.is_active) ?? null
}
