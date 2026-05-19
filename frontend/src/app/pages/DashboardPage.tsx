import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/features/auth/auth-store'
import { listSubjects } from '@/features/workspace/workspace-api'
import { useWorkspaceStore } from '@/features/workspace/workspace-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

export function DashboardPage() {
  const { t } = useTranslation('common')
  const user = useAuthStore((s) => s.user)
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)

  const subjectsQuery = useQuery({
    queryKey: ['subjects', workspaceId],
    queryFn: () => listSubjects(workspaceId!),
    enabled: Boolean(workspaceId),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('nav.dashboard')}</h1>
        <p className="mt-2 text-muted-foreground">
          {user?.display_name || user?.email}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subjects</CardTitle>
          <CardDescription>
            {workspaceId
              ? `${subjectsQuery.data?.length ?? 0} subject(s) in active workspace`
              : 'Select a workspace'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc text-sm">
            {subjectsQuery.data?.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
