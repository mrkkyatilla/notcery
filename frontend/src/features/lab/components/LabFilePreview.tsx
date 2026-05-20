import { useEffect, useState, type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { MarkdownMessage } from '@/features/chat/components/MarkdownMessage'
import { CodePreview } from '@/features/lab/components/CodePreview'
import { PdfPreview } from '@/features/lab/components/PdfPreview'
import { fetchLabFileBlob } from '@/features/lab/lab-file-stream'
import { useLabFileContent } from '@/features/lab/queries'
import type { LabFile } from '@/features/lab/types'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

type Props = {
  file: LabFile
}

function CsvTable({ content }: { content: string }) {
  const rows = content
    .trim()
    .split(/\r?\n/)
    .slice(0, 200)
    .map((line) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/))
  if (!rows.length) return null
  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-xs">
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className={i === 0 ? 'bg-muted/80 font-medium' : 'border-t border-border/50'}>
              {cells.map((cell, j) => (
                <td key={j} className="border border-border/40 px-2 py-1">
                  {cell.replace(/^"|"$/g, '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ImagePreview({ fileId, alt }: { fileId: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | undefined
    void fetchLabFileBlob(fileId)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'))
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId])

  if (error) return <p className="p-4 text-sm text-destructive">{error}</p>
  if (!src) return <Skeleton className="m-4 h-48 w-full" />
  return (
    <div className="flex justify-center p-4">
      <img src={src} alt={alt} className="max-w-full object-contain" />
    </div>
  )
}

export function LabFilePreview({ file }: Props) {
  const { t } = useTranslation('lab')
  const contentQuery = useLabFileContent(file.id)
  const isMarkdown = /\.(md|markdown)$/i.test(file.name)
  const isCsv = /\.csv$/i.test(file.name)

  const scrollWrap = (body: ReactElement) => (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-auto overscroll-contain">
      {body}
    </div>
  )

  if (contentQuery.isLoading) {
    return scrollWrap(<Skeleton className="m-4 h-32 w-full" />)
  }

  if (contentQuery.isError || !contentQuery.data) {
    return scrollWrap(
      <div className="p-4 text-sm text-muted-foreground">{t('viewer.notReadable')}</div>,
    )
  }

  const data = contentQuery.data
  const downloadUrl = data.download_url

  if (data.preview_kind === 'pdf') {
    return scrollWrap(<PdfPreview fileId={file.id} />)
  }

  if (data.preview_kind === 'image') {
    return scrollWrap(<ImagePreview fileId={file.id} alt={file.name} />)
  }

  if (data.preview_kind === 'binary') {
    return scrollWrap(
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
        <p>{t('viewer.binaryHint')}</p>
        {downloadUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a href={downloadUrl} target="_blank" rel="noreferrer">
              {t('viewer.download')}
            </a>
          </Button>
        ) : null}
      </div>,
    )
  }

  const content = data.content ?? ''

  if (isMarkdown) {
    return scrollWrap(
      <div className="p-4">
        <MarkdownMessage content={content} />
      </div>,
    )
  }

  if (isCsv) {
    return scrollWrap(
      <div className="p-3">
        <CsvTable content={content} />
      </div>,
    )
  }

  return scrollWrap(
    <div className="p-3">
      <CodePreview filename={file.name} content={content} />
    </div>,
  )
}
