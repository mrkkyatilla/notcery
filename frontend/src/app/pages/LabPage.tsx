import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { FileTree } from '@/features/lab/components/FileTree'
import { FileViewer } from '@/features/lab/components/FileViewer'
import { LabAgentSidebar } from '@/features/lab/components/LabAgentSidebar'
import { fileIconColorClass } from '@/features/lab/file-icon-colors'
import { labFileIcon } from '@/features/lab/file-icons'
import { listLabFiles } from '@/features/lab/lab-api'
import type { LabFile } from '@/features/lab/types'
import { useWorkspaceStore } from '@/features/workspace/workspace-store'
import { cn } from '@/shared/lib/utils'

export function LabPage() {
  const { workspaceId, fileId: routeFileId } = useParams<{
    workspaceId: string
    fileId?: string
  }>()
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId)
  const [selectedFile, setSelectedFile] = useState<LabFile | null>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null)
  const [openTabs, setOpenTabs] = useState<LabFile[]>([])
  const [focusedFileIds, setFocusedFileIds] = useState<string[]>([])

  useEffect(() => {
    if (workspaceId) setActiveWorkspaceId(workspaceId)
  }, [workspaceId, setActiveWorkspaceId])

  const openFile = useCallback((file: LabFile) => {
    setSelectedFile(file)
    setSelectedFileIds([file.id])
    setSelectionAnchorId(file.id)
    setOpenTabs((prev) => {
      if (prev.some((f) => f.id === file.id)) return prev
      return [...prev, file]
    })
  }, [])

  const handleSelectionChange = useCallback((ids: string[], anchorId: string) => {
    setSelectedFileIds(ids)
    setSelectionAnchorId(anchorId)
  }, [])

  useEffect(() => {
    if (!workspaceId || !routeFileId) return
    void listLabFiles(workspaceId).then((files) => {
      const found = files.find((f) => f.id === routeFileId)
      if (found) openFile(found)
    })
  }, [workspaceId, routeFileId, openFile])

  const handleOpenFileId = useCallback(
    async (id: string) => {
      if (!workspaceId) return
      const files = await listLabFiles(workspaceId)
      const found = files.find((f) => f.id === id)
      if (found) openFile(found)
    },
    [workspaceId, openFile],
  )

  const closeTab = (fileId: string) => {
    setOpenTabs((prev) => {
      const next = prev.filter((f) => f.id !== fileId)
      if (selectedFile?.id === fileId) {
        const last = next[next.length - 1] ?? null
        setSelectedFile(last)
      }
      return next
    })
  }

  const toggleFocus = useCallback((fileId: string) => {
    setFocusedFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((x) => x !== fileId) : [...prev, fileId],
    )
  }, [])

  if (!workspaceId) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-[#1e1e1e]">
      <FileTree
        workspaceId={workspaceId}
        selectedFileIds={selectedFileIds}
        primaryFileId={selectedFile?.id ?? null}
        selectionAnchorId={selectionAnchorId}
        onSelectionChange={handleSelectionChange}
        onOpenFile={openFile}
        focusedFileIds={focusedFileIds}
        onToggleFocus={toggleFocus}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col border-x border-[#3c3c3c]">
        {openTabs.length > 0 ? (
          <div className="flex shrink-0 overflow-x-auto border-b border-[#252526] bg-[#2d2d2d]">
            {openTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  'group flex max-w-[200px] items-center gap-1 border-r border-[#252526] px-3 py-1.5 text-xs',
                  selectedFile?.id === tab.id
                    ? 'bg-[#1e1e1e] text-[#ffffff]'
                    : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#1e1e1e]',
                )}
                onClick={() => setSelectedFile(tab)}
              >
                <span className={fileIconColorClass(tab.name)}>
                  {labFileIcon(tab.name, 'size-3 shrink-0')}
                </span>
                <span className="truncate">{tab.name}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className="ml-1 rounded p-0.5 opacity-0 hover:bg-[#3c3c3c] group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation()
                      closeTab(tab.id)
                    }
                  }}
                >
                  <X className="size-3" />
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-hidden">
          <FileViewer file={selectedFile} />
        </div>
      </div>
      <LabAgentSidebar
        workspaceId={workspaceId}
        focusedFileIds={focusedFileIds}
        selectedFileId={selectedFile?.id ?? null}
        onOpenFile={openFile}
        onOpenFileId={handleOpenFileId}
      />
    </div>
  )
}
