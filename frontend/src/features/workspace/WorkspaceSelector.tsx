import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import {
  createWorkspace,
  listWorkspaces,
} from '@/features/workspace/workspace-api'
import { useWorkspaceStore } from '@/features/workspace/workspace-store'
import { showApiError } from '@/shared/api/show-api-error'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useEffect, useMemo, useState } from 'react'

export function WorkspaceSelector() {
  const { t } = useTranslation('settings')
  const queryClient = useQueryClient()
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const setActiveId = useWorkspaceStore((s) => s.setActiveWorkspaceId)
  const [name, setName] = useState('')

  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
  })

  const createMutation = useMutation({
    mutationFn: (workspaceName: string) => createWorkspace({ name: workspaceName }),
    onSuccess: (workspace) => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      setActiveId(workspace.id)
      setName('')
    },
    onError: showApiError,
  })

  const workspaces = useMemo(
    () => workspacesQuery.data ?? [],
    [workspacesQuery.data],
  )

  useEffect(() => {
    if (!activeId && workspaces[0]) {
      setActiveId(workspaces[0].id)
    }
  }, [activeId, setActiveId, workspaces])

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="workspace-select">{t('workspace.label')}</Label>
        <select
          id="workspace-select"
          className="flex h-9 min-w-[12rem] rounded-md border border-input bg-transparent px-3 text-sm"
          value={activeId ?? ''}
          onChange={(e) => setActiveId(e.target.value || null)}
          disabled={workspacesQuery.isLoading || workspaces.length === 0}
        >
          {workspaces.length === 0 ? (
            <option value="">{t('workspace.empty')}</option>
          ) : (
            workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))
          )}
        </select>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={t('workspace.create')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-40"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!name.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate(name.trim())}
        >
          +
        </Button>
      </div>
    </div>
  )
}
