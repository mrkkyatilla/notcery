import { create } from 'zustand'

type PlanGenerationState = {
  isGenerating: boolean
  taskId: string | null
  adjustments: string[] | null
  lastPlanVersionId: string | null
  setGenerating: (active: boolean, taskId?: string | null) => void
  setAdjustments: (items: string[] | null) => void
  setLastPlanVersionId: (id: string | null) => void
  reset: () => void
}

export const usePlanGenerationStore = create<PlanGenerationState>((set) => ({
  isGenerating: false,
  taskId: null,
  adjustments: null,
  lastPlanVersionId: null,
  setGenerating: (active, taskId = null) =>
    set({ isGenerating: active, taskId: active ? taskId : null }),
  setAdjustments: (adjustments) => set({ adjustments }),
  setLastPlanVersionId: (id) => set({ lastPlanVersionId: id }),
  reset: () =>
    set({
      isGenerating: false,
      taskId: null,
      adjustments: null,
      lastPlanVersionId: null,
    }),
}))
