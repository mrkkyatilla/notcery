import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'

import { ArtifactPanel } from '@/features/lab/components/ArtifactPanel'
import { FileTree } from '@/features/lab/components/FileTree'
import { FileViewer } from '@/features/lab/components/FileViewer'
import { LabAgentChat } from '@/features/lab/components/LabAgentChat'
import { fileIconColorClass } from '@/features/lab/file-icon-colors'
import { labFileIcon } from '@/features/lab/file-icons'
import { listLabFiles } from '@/features/lab/lab-api'
import type { LabFile } from '@/features/lab/types'
import { useWorkspaceStore } from '@/features/workspace/workspace-store'
import { cn } from '@/shared/lib/utils'

export function LabPage() {
  const { t } = useTranslation('lab')
  const { workspaceId, fileId: routeFileId } = useParams<{
    workspaceId: string
    fileId?: string
  }>()
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId)
  const [selectedFile, setSelectedFile] = useState<LabFile | null>(null)
  const [openTabs, setOpenTabs] = useState<LabFile[]>([])
  const [focusedFileIds, setFocusedFileIds] = useState<string[]>([])
  const [showChat, setShowChat] = useState(true)

  useEffect(() => {
    if (workspaceId) setActiveWorkspaceId(workspaceId)
  }, [workspaceId, setActiveWorkspaceId])

  const openFile = useCallback((file: LabFile) => {
    setSelectedFile(file)
    setOpenTabs((prev) => {
      if (prev.some((f) => f.id === file.id)) return prev
      return [...prev, file]
    })
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
    <div className="grid h-full grid-cols-1 bg-[#1e1e1e] lg:grid-cols-[260px_minmax(0,1fr)_220px]">
      <FileTree
        workspaceId={workspaceId}
        selectedFileId={selectedFile?.id ?? null}
        focusedFileIds={focusedFileIds}
        onSelectFile={openFile}
        onToggleFocus={toggleFocus}
      />
      <div className="flex min-w-0 flex-col border-x border-[#3c3c3c]">
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
        <div
          className={cn(
            'grid min-h-0 flex-1',
            selectedFile && showChat ? 'grid-rows-[minmax(200px,1fr)_minmax(180px,40%)]' : 'grid-rows-1',
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <FileViewer file={selectedFile} />
          </div>
          {showChat ? (
            <div className="min-h-0 border-t border-[#3c3c3c]">
              <LabAgentChat
                workspaceId={workspaceId}
                focusedFileIds={focusedFileIds}
                onOpenFile={handleOpenFileId}
              />
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[#3c3c3c] bg-[#252526] px-2 py-1">
          <button
            type="button"
            className="text-[11px] text-[#858585] hover:text-[#cccccc]"
            onClick={() => setShowChat((v) => !v)}
          >
            {showChat ? t('layout.hideChat') : t('layout.showChat')}
          </button>
        </div>
      </div>
      <ArtifactPanel
        workspaceId={workspaceId}
        selectedFileId={selectedFile?.id ?? null}
        onSelectFile={openFile}
      />
    </div>
  )
}
