import mermaid from 'mermaid'
import { useEffect, useId, useRef, useState } from 'react'

import { cn } from '@/shared/lib/utils'

let mermaidInitialized = false

function initMermaid() {
  if (mermaidInitialized) return
  const dark =
    document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches
  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? 'dark' : 'default',
    securityLevel: 'strict',
    fontFamily: 'inherit',
  })
  mermaidInitialized = true
}

type Props = {
  code: string
  className?: string
}

export function MermaidBlock({ code, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const id = useId().replace(/:/g, '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !code.trim()) return

    let cancelled = false
    initMermaid()

    const run = async () => {
      try {
        setError(null)
        const { svg } = await mermaid.render(`mermaid-${id}`, code.trim())
        if (!cancelled) el.innerHTML = svg
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Mermaid render failed')
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [code, id])

  if (error) {
    return (
      <pre className={cn('mb-2 overflow-x-auto rounded-md bg-muted p-2 text-xs', className)}>
        <code>{code}</code>
        <p className="mt-1 text-destructive">{error}</p>
      </pre>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'note-mermaid mb-2 flex justify-center overflow-x-auto rounded-md border border-border bg-muted/30 p-3',
        className,
      )}
      aria-label="Diagram"
    />
  )
}
