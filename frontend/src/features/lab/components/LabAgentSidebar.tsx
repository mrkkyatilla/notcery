import { useCallback, useEffect, useRef, useState } from 'react'

import { ArtifactPanel } from '@/features/lab/components/ArtifactPanel'
import { LabAgentChat } from '@/features/lab/components/LabAgentChat'
import type { LabFile } from '@/features/lab/types'
import { cn } from '@/shared/lib/utils'

const STORAGE_KEY = 'notcery-lab-agent-panel-width'
const DEFAULT_WIDTH = 400
const MIN_WIDTH = 300
const MAX_WIDTH = 720

type Props = {
  workspaceId: string
  focusedFileIds: string[]
  selectedFileId: string | null
  onOpenFile: (file: LabFile) => void
  onOpenFileId: (fileId: string) => void
}

function readStoredWidth(): number {
  try {
    const n = Number.parseInt(localStorage.getItem(STORAGE_KEY) ?? '', 10)
    if (Number.isFinite(n) && n >= MIN_WIDTH && n <= MAX_WIDTH) return n
  } catch {
    /* ignore */
  }
  return DEFAULT_WIDTH
}

export function LabAgentSidebar({
  workspaceId,
  focusedFileIds,
  selectedFileId,
  onOpenFile,
  onOpenFileId,
}: Props) {
  const [width, setWidth] = useState(readStoredWidth)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(width)

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return
    const delta = startX.current - e.clientX
    const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
    setWidth(next)
  }, [])

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }, [onPointerMove])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(width))
    } catch {
      /* ignore */
    }
  }, [width])

  useEffect(
    () => () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    },
    [onPointerMove, onPointerUp],
  )

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  return (
    <aside
      className="relative hidden h-full min-h-0 shrink-0 lg:flex"
      style={{ width }}
      aria-label="Lab agent"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={width}
        tabIndex={0}
        className={cn(
          'absolute left-0 top-0 z-10 h-full w-1.5 -translate-x-1/2 cursor-col-resize',
          'bg-transparent hover:bg-[#007acc]/60 active:bg-[#007acc]',
        )}
        onPointerDown={startResize}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setWidth((w) => Math.min(MAX_WIDTH, w + 16))
          if (e.key === 'ArrowRight') setWidth((w) => Math.max(MIN_WIDTH, w - 16))
        }}
      />
      <div className="flex h-full min-h-0 w-full flex-col border-l border-[#3c3c3c] bg-[#252526]">
        <div className="min-h-0 flex-1">
          <LabAgentChat
            workspaceId={workspaceId}
            focusedFileIds={focusedFileIds}
            onOpenFile={onOpenFileId}
          />
        </div>
        <ArtifactPanel
          workspaceId={workspaceId}
          selectedFileId={selectedFileId}
          onSelectFile={onOpenFile}
        />
      </div>
    </aside>
  )
}
