import type { LabSession } from '@/features/lab/types'

const PREFIX = 'notcery_lab_session_'

export function loadLabSession(workspaceId: string): LabSession | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${workspaceId}`)
    return raw ? (JSON.parse(raw) as LabSession) : null
  } catch {
    return null
  }
}

export function saveLabSession(workspaceId: string, session: LabSession): void {
  localStorage.setItem(`${PREFIX}${workspaceId}`, JSON.stringify(session))
}

export function clearLabSession(workspaceId: string): void {
  localStorage.removeItem(`${PREFIX}${workspaceId}`)
}
