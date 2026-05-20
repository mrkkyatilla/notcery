import * as pdfjs from 'pdfjs-dist'
import { useEffect, useRef, useState } from 'react'

import { fetchLabFileBlob } from '@/features/lab/lab-file-stream'
import { Skeleton } from '@/shared/ui/skeleton'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

type Props = {
  fileId: string
}

export function PdfPreview({ fileId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let objectUrl: string | undefined

    void (async () => {
      setLoading(true)
      setError(null)
      container.innerHTML = ''
      try {
        const blob = await fetchLabFileBlob(fileId)
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        const pdf = await pdfjs.getDocument({ url: objectUrl }).promise
        if (cancelled) return

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          const page = await pdf.getPage(pageNum)
          if (cancelled) return
          const viewport = page.getViewport({ scale: 1.25 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.className = 'mx-auto mb-4 max-w-full shadow-md'
          const ctx = canvas.getContext('2d')
          if (!ctx) continue
          await page.render({ canvasContext: ctx, viewport }).promise
          if (!cancelled) container.appendChild(canvas)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'PDF load failed')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId])

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error) {
    return <p className="p-4 text-sm text-destructive">{error}</p>
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center overflow-auto bg-[#525659] p-4"
    />
  )
}
