import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { folderIcon, labFileIcon } from '@/features/lab/file-icons'
import {
  useCreateLabFolder,
  useDeleteLabFile,
  useLabFiles,
  useLabFolders,
  useUploadLabFile,
} from '@/features/lab/queries'
import type { LabFile, LabFolder } from '@/features/lab/types'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'

type Props = {
  workspaceId: string
  selectedFileId: string | null
  focusedFileIds: string[]
  onSelectFile: (file: LabFile) => void
  onToggleFocus: (fileId: string) => void
}

function buildTree(folders: LabFolder[], files: LabFile[]) {
  const folderById = new Map(folders.map((f) => [f.id, f]))
  const childrenByParent = new Map<string | null, LabFolder[]>()
  for (const f of folders) {
    const pid = f.parent_id ?? null
    const list = childrenByParent.get(pid) ?? []
    list.push(f)
    childrenByParent.set(pid, list)
  }
  const filesByFolder = new Map<string | null, LabFile[]>()
  for (const file of files) {
    if (file.kind === 'artifact') continue
    const fid = file.folder_id ?? null
    const list = filesByFolder.get(fid) ?? []
    list.push(file)
    filesByFolder.set(fid, list)
  }
  return { folderById, childrenByParent, filesByFolder }
}

export function FileTree({
  workspaceId,
  selectedFileId,
  focusedFileIds,
  onSelectFile,
  onToggleFocus,
}: Props) {
  const { t } = useTranslation('lab')
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['/']))
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const foldersQuery = useLabFolders(workspaceId)
  const filesQuery = useLabFiles(workspaceId, null)
  const uploadMutation = useUploadLabFile(workspaceId, currentFolderId)
  const createFolderMutation = useCreateLabFolder(workspaceId)
  const deleteMutation = useDeleteLabFile(workspaceId)
  const [newFolderName, setNewFolderName] = useState('')

  const tree = useMemo(
    () => buildTree(foldersQuery.data ?? [], filesQuery.data ?? []),
    [foldersQuery.data, filesQuery.data],
  )

  const rootFolder = (foldersQuery.data ?? []).find((f) => f.path === '/')
  const rootFolders = rootFolder
    ? tree.childrenByParent.get(rootFolder.id) ?? []
    : tree.childrenByParent.get(null) ?? []
  const rootFiles = rootFolder
    ? tree.filesByFolder.get(rootFolder.id) ?? []
    : []

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const renderFolder = (folder: LabFolder, depth: number) => {
    const isOpen = expanded.has(folder.path)
    const childFolders = tree.childrenByParent.get(folder.id) ?? []
    const childFiles = tree.filesByFolder.get(folder.id) ?? []

    return (
      <div key={folder.id}>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-sm hover:bg-muted/60',
            currentFolderId === folder.id && 'bg-muted',
          )}
          style={{ paddingLeft: depth * 12 + 4 }}
          onClick={() => {
            toggleExpand(folder.path)
            setCurrentFolderId(folder.id)
          }}
        >
          {folderIcon()}
          <span className="truncate">{folder.name}</span>
        </button>
        {isOpen ? (
          <>
            {childFolders.map((c) => renderFolder(c, depth + 1))}
            {childFiles.map((file) => renderFile(file, depth + 1))}
          </>
        ) : null}
      </div>
    )
  }

  const renderFile = (file: LabFile, depth: number) => {
    const focused = focusedFileIds.includes(file.id)
    return (
      <div
        key={file.id}
        className="flex items-center gap-1 pr-1"
        style={{ paddingLeft: depth * 12 + 4 }}
      >
        <button
          type="button"
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-0.5 text-left text-sm hover:bg-muted/60',
            selectedFileId === file.id && 'bg-primary/10',
          )}
          onClick={() => onSelectFile(file)}
        >
          {labFileIcon(file.name)}
          <span className="truncate">{file.name}</span>
          {file.index_status && file.index_status !== 'ready' ? (
            <span className="text-[10px] text-muted-foreground">{file.index_status}</span>
          ) : null}
        </button>
        <button
          type="button"
          title={t('tree.focus')}
          className={cn(
            'rounded px-1 text-[10px]',
            focused ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
          )}
          onClick={() => onToggleFocus(file.id)}
        >
          RAG
        </button>
        <button
          type="button"
          className="text-[10px] text-destructive hover:underline"
          onClick={() => deleteMutation.mutate(file.id)}
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col border-r bg-card/30">
      <div className="border-b p-2 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('tree.title')}
        </p>
        <label className="block">
          <span className="sr-only">{t('tree.upload')}</span>
          <Input
            type="file"
            multiple
            className="text-xs"
            onChange={(e) => {
              const list = e.target.files
              if (!list) return
              Array.from(list).forEach((f) => uploadMutation.mutate(f))
              e.target.value = ''
            }}
          />
        </label>
        <div className="flex gap-1">
          <Input
            placeholder={t('tree.newFolder')}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0"
            disabled={!newFolderName.trim()}
            onClick={() => {
              createFolderMutation.mutate(
                { name: newFolderName.trim(), parent_id: currentFolderId },
                { onSuccess: () => setNewFolderName('') },
              )
            }}
          >
            +
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        <button
          type="button"
          className="mb-1 w-full rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
          onClick={() => setCurrentFolderId(null)}
        >
          {t('tree.root')}
        </button>
        {rootFolders.map((f) => renderFolder(f, 0))}
        {rootFiles.map((f) => renderFile(f, 0))}
      </div>
    </div>
  )
}
