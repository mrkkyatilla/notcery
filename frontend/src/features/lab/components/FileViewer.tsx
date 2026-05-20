import { useTranslation } from 'react-i18next'

import { MarkdownMessage } from '@/features/chat/components/MarkdownMessage'
import { useLabFileContent } from '@/features/lab/queries'
import type { LabFile } from '@/features/lab/types'
import { Skeleton } from '@/shared/ui/skeleton'

type Props = {
  file: LabFile | null
}

export function FileViewer({ file }: Props) {
  const { t } = useTranslation('lab')
  const contentQuery = useLabFileContent(file?.id)

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t('viewer.empty')}
      </div>
    )
  }

  if (contentQuery.isLoading) {
    return <Skeleton className="m-4 h-32 w-full" />
  }

  if (contentQuery.isError) {
    return (
      <div className="p-4 text-sm text-muted-foreground">{t('viewer.notReadable')}</div>
    )
  }

  const content = contentQuery.data?.content ?? ''
  const isMarkdown = /\.(md|markdown)$/i.test(file.name)

  return (
    <div className="flex h-full flex-col overflow-hidden border-b">
      <div className="border-b px-3 py-2 text-sm font-medium">{file.name}</div>
      <div className="flex-1 overflow-auto p-3">
        {isMarkdown ? (
          <MarkdownMessage content={content} />
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{content}</pre>
        )}
      </div>
    </div>
  )
}
