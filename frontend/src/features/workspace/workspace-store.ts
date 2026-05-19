import { create } from 'zustand'

const WORKSPACE_KEY = 'notcery_active_workspace'

type WorkspaceState = {
  activeWorkspaceId: string | null
  setActiveWorkspaceId: (id: string | null) => void
  hydrate: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspaceId: null,
  setActiveWorkspaceId: (id) => {
    if (id) {
      localStorage.setItem(WORKSPACE_KEY, id)
    } else {
      localStorage.removeItem(WORKSPACE_KEY)
    }
    set({ activeWorkspaceId: id })
  },
  hydrate: () => {
    const id = localStorage.getItem(WORKSPACE_KEY)
    set({ activeWorkspaceId: id })
  },
}))
