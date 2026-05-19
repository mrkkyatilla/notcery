import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { DocumentList } from '@/features/library/DocumentList'
import { DocumentUpload } from '@/features/library/DocumentUpload'
import { RetrieveDebugPanel } from '@/features/library/RetrieveDebugPanel'
import { StorageQuotaBar } from '@/features/library/StorageQuotaBar'
import { useDocuments } from '@/features/library/queries'
import { useWorkspaceStore } from '@/features/workspace/workspace-store'

export function LibraryPage() {
  const { t } = useTranslation('library')
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId)
  const documentsQuery = useDocuments(workspaceId ?? null)
  const toastedFailures = useRef(new Set<string>())

  useEffect(() => {
    if (workspaceId) setActiveWorkspaceId(workspaceId)
  }, [workspaceId, setActiveWorkspaceId])

  useEffect(() => {
    const docs = documentsQuery.data
    if (!docs) return
    for (const doc of docs) {
      if (doc.status !== 'failed' || !doc.id || !doc.error_message) continue
      if (toastedFailures.current.has(doc.id)) continue
      toastedFailures.current.add(doc.id)
      toast.error(t('list.indexFailed', { message: doc.error_message }))
    }
  }, [documentsQuery.data, t])

  if (!workspaceId) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>
      <StorageQuotaBar />
      <DocumentUpload workspaceId={workspaceId} />
      <DocumentList
        workspaceId={workspaceId}
        documents={documentsQuery.data}
        isLoading={documentsQuery.isLoading}
      />
      <RetrieveDebugPanel workspaceId={workspaceId} />
    </div>
  )
}
