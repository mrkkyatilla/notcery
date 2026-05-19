import { useTranslation } from 'react-i18next'

import { DocumentStatusBadge } from '@/features/library/DocumentStatusBadge'
import { formatBytes } from '@/features/library/mime'
import { useDeleteDocument } from '@/features/library/queries'
import type { Document } from '@/features/library/types'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

type Props = {
  workspaceId: string
  documents: Document[] | undefined
  isLoading: boolean
}

export function DocumentList({ workspaceId, documents, isLoading }: Props) {
  const { t } = useTranslation('library')
  const deleteMutation = useDeleteDocument(workspaceId)

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (!documents?.length) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t('list.empty')}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-4 py-2 font-medium">{t('list.filename')}</th>
            <th className="px-4 py-2 font-medium">{t('list.size')}</th>
            <th className="px-4 py-2 font-medium">{t('list.status')}</th>
            <th className="px-4 py-2 font-medium">{t('list.created')}</th>
            <th className="px-4 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className="border-b last:border-0">
              <td className="max-w-[240px] truncate px-4 py-2" title={doc.original_filename}>
                {doc.original_filename}
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {doc.size_bytes != null ? formatBytes(doc.size_bytes) : '—'}
              </td>
              <td className="px-4 py-2">
                <DocumentStatusBadge status={doc.status} />
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {doc.created_at
                  ? new Date(doc.created_at).toLocaleString()
                  : '—'}
              </td>
              <td className="px-4 py-2 text-right">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  onClick={() => doc.id && deleteMutation.mutate(doc.id)}
                >
                  {t('list.delete')}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
