import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { ArtifactPanel } from '@/features/lab/components/ArtifactPanel'
import { FileTree } from '@/features/lab/components/FileTree'
import { FileViewer } from '@/features/lab/components/FileViewer'
import { LabAgentChat } from '@/features/lab/components/LabAgentChat'
import { listLabFiles } from '@/features/lab/lab-api'
import type { LabFile } from '@/features/lab/types'
import { useWorkspaceStore } from '@/features/workspace/workspace-store'

export function LabPage() {
  const { workspaceId, fileId: routeFileId } = useParams<{
    workspaceId: string
    fileId?: string
  }>()
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId)
  const [selectedFile, setSelectedFile] = useState<LabFile | null>(null)
  const [focusedFileIds, setFocusedFileIds] = useState<string[]>([])

  useEffect(() => {
    if (workspaceId) setActiveWorkspaceId(workspaceId)
  }, [workspaceId, setActiveWorkspaceId])

  useEffect(() => {
    if (!workspaceId || !routeFileId) return
    void listLabFiles(workspaceId).then((files) => {
      const found = files.find((f) => f.id === routeFileId)
      if (found) setSelectedFile(found)
    })
  }, [workspaceId, routeFileId])

  const handleOpenFileId = useCallback(
    async (id: string) => {
      if (!workspaceId) return
      const files = await listLabFiles(workspaceId)
      const found = files.find((f) => f.id === id)
      if (found) setSelectedFile(found)
    },
    [workspaceId],
  )

  const toggleFocus = useCallback((fileId: string) => {
    setFocusedFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((x) => x !== fileId) : [...prev, fileId],
    )
  }, [])

  if (!workspaceId) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_200px]">
      <FileTree
        workspaceId={workspaceId}
        selectedFileId={selectedFile?.id ?? null}
        focusedFileIds={focusedFileIds}
        onSelectFile={setSelectedFile}
        onToggleFocus={toggleFocus}
      />
      <div className="flex min-w-0 flex-col border-x">
        {selectedFile ? <FileViewer file={selectedFile} /> : null}
        <div className={selectedFile ? 'min-h-0 flex-1' : 'h-full'}>
          <LabAgentChat
            workspaceId={workspaceId}
            focusedFileIds={focusedFileIds}
            onOpenFile={handleOpenFileId}
          />
        </div>
      </div>
      <ArtifactPanel
        workspaceId={workspaceId}
        selectedFileId={selectedFile?.id ?? null}
        onSelectFile={setSelectedFile}
      />
    </div>
  )
}
