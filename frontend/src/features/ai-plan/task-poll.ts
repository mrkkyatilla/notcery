export type TaskPollPhase = 'idle' | 'polling' | 'success' | 'failed'

export type TaskStatus = 'pending' | 'success' | 'failed'

export function taskStatusToPhase(status: TaskStatus | undefined): TaskPollPhase {
  if (!status || status === 'pending') return 'polling'
  if (status === 'success') return 'success'
  return 'failed'
}

export function shouldPollTask(phase: TaskPollPhase): boolean {
  return phase === 'polling'
}

export function pollIntervalMs(phase: TaskPollPhase): number | false {
  return shouldPollTask(phase) ? 2000 : false
}
