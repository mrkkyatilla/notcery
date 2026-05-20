import { ChevronDown, ChevronRight, FolderPlus } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { fileIconColorClass } from '@/features/lab/file-icon-colors'
import { folderIcon, labFileIcon } from '@/features/lab/file-icons'
import {
  hasExternalFilesDrag,
  hasLabFilesDrag,
  readLabFilesDragData,
  setLabFilesDragData,
} from '@/features/lab/lab-dnd'
import { collectFilesInTreeOrder, rangeSelectIds } from '@/features/lab/lab-tree-order'
import {
  useCreateLabFolder,
  useDeleteLabFile,
  useLabFiles,
  useLabFolders,
  useMoveLabFiles,
  useUpdateLabFile,
  useUploadLabFile,
} from '@/features/lab/queries'
import type { LabFile, LabFolder } from '@/features/lab/types'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'

type Props = {
  workspaceId: string
  selectedFileIds: string[]
  primaryFileId: string | null
  selectionAnchorId: string | null
  onSelectionChange: (ids: string[], anchorId: string) => void
  onOpenFile: (file: LabFile) => void
  focusedFileIds: string[]
  onToggleFocus: (fileId: string) => void
}

function buildTree(folders: LabFolder[], files: LabFile[]) {
  const childrenByParent = new Map<string | null, LabFolder[]>()
  for (const f of folders) {
    if (f.path === '/') continue
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
  return { childrenByParent, filesByFolder }
}

export function FileTree({
  workspaceId,
  selectedFileIds,
  primaryFileId,
  selectionAnchorId,
  onSelectionChange,
  onOpenFile,
  focusedFileIds,
  onToggleFocus,
}: Props) {
  const { t } = useTranslation('lab')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['/']))
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null)
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const foldersQuery = useLabFolders(workspaceId)
  const filesQuery = useLabFiles(workspaceId, null)
  const createFolderMutation = useCreateLabFolder(workspaceId)
  const deleteMutation = useDeleteLabFile(workspaceId)
  const updateFileMutation = useUpdateLabFile(workspaceId)
  const moveFilesMutation = useMoveLabFiles(workspaceId)
  const uploadMutation = useUploadLabFile(workspaceId, currentFolderId)
  const [newFolderName, setNewFolderName] = useState('')

  const tree = useMemo(
    () => buildTree(foldersQuery.data ?? [], filesQuery.data ?? []),
    [foldersQuery.data, filesQuery.data],
  )

  const rootFolder = (foldersQuery.data ?? []).find((f) => f.path === '/')
  const uploadFolderId = currentFolderId ?? rootFolder?.id ?? null

  const flatFiles = useMemo(
    () => collectFilesInTreeOrder(rootFolder, tree, expanded),
    [rootFolder, tree, expanded],
  )

  const rootFolders = rootFolder
    ? tree.childrenByParent.get(rootFolder.id) ?? []
    : tree.childrenByParent.get(null) ?? []
  const rootFiles = rootFolder ? (tree.filesByFolder.get(rootFolder.id) ?? []) : []

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const dragFileIds = useCallback(
    (file: LabFile) =>
      selectedFileIds.includes(file.id) && selectedFileIds.length > 0
        ? selectedFileIds
        : [file.id],
    [selectedFileIds],
  )

  const handleFileClick = (file: LabFile, e: React.MouseEvent) => {
    const ctrl = e.ctrlKey || e.metaKey
    const shift = e.shiftKey

    if (shift && selectionAnchorId) {
      const ids = rangeSelectIds(flatFiles, selectionAnchorId, file.id)
      onSelectionChange(ids, selectionAnchorId)
      onOpenFile(file)
      return
    }

    if (ctrl) {
      const next = selectedFileIds.includes(file.id)
        ? selectedFileIds.filter((id) => id !== file.id)
        : [...selectedFileIds, file.id]
      onSelectionChange(next.length ? next : [file.id], file.id)
      onOpenFile(file)
      return
    }

    onSelectionChange([file.id], file.id)
    onOpenFile(file)
  }

  const moveToFolder = (fileIds: string[], folderId: string) => {
    if (!fileIds.length) return
    moveFilesMutation.mutate({ fileIds, folderId })
  }

  const uploadFilesToFolder = (files: FileList | File[], folderId: string | null) => {
    const target = folderId ?? rootFolder?.id ?? null
    Array.from(files).forEach((file) => {
      uploadMutation.mutate({ file, folderId: target })
    })
  }

  const folderDropHandlers = (folderId: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (hasLabFilesDrag(e.dataTransfer) || hasExternalFilesDrag(e.dataTransfer)) {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = hasLabFilesDrag(e.dataTransfer) ? 'move' : 'copy'
        setDropTargetFolderId(folderId)
      }
    },
    onDragLeave: (e: React.DragEvent) => {
      e.stopPropagation()
      setDropTargetFolderId((prev) => (prev === folderId ? null : prev))
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDropTargetFolderId(null)
      const labIds = readLabFilesDragData(e.dataTransfer)
      if (labIds.length) {
        moveToFolder(labIds, folderId)
        return
      }
      if (e.dataTransfer.files.length) {
        uploadFilesToFolder(e.dataTransfer.files, folderId)
      }
    },
  })

  const submitRename = (file: LabFile) => {
    const name = renameValue.trim()
    if (!name || name === file.name) {
      setRenamingFileId(null)
      return
    }
    updateFileMutation.mutate(
      { fileId: file.id, name },
      { onSuccess: () => setRenamingFileId(null) },
    )
  }

  const renderFolder = (folder: LabFolder, depth: number) => {
    const isOpen = expanded.has(folder.path)
    const isDropTarget = dropTargetFolderId === folder.id
    const childFolders = tree.childrenByParent.get(folder.id) ?? []
    const childFiles = tree.filesByFolder.get(folder.id) ?? []

    return (
      <div key={folder.id}>
        <div
          {...folderDropHandlers(folder.id)}
          className={cn(
            'flex w-full items-center gap-0.5 rounded px-1 py-0.5 text-left text-[13px]',
            isDropTarget && 'bg-[#094771] ring-1 ring-[#007acc]',
            currentFolderId === folder.id && !isDropTarget && 'bg-[#37373d]',
          )}
          style={{ paddingLeft: depth * 12 + 4 }}
        >
          <button
            type="button"
            className="shrink-0 text-[#858585] hover:text-[#cccccc]"
            onClick={() => toggleExpand(folder.path)}
            aria-label={isOpen ? 'Collapse' : 'Expand'}
          >
            {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1 hover:bg-[#2a2d2e]"
            onClick={() => {
              setCurrentFolderId(folder.id)
              if (!isOpen) toggleExpand(folder.path)
            }}
          >
            <span className="text-amber-400/90">{folderIcon()}</span>
            <span className="truncate text-[#cccccc]">{folder.name}</span>
          </button>
        </div>
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
    const isSelected = selectedFileIds.includes(file.id)
    const isPrimary = primaryFileId === file.id
    const isRenaming = renamingFileId === file.id

    return (
      <div
        key={file.id}
        className="group flex items-center gap-0.5 pr-1"
        style={{ paddingLeft: depth * 12 + 20 }}
        draggable={!isRenaming}
        onDragStart={(e) => {
          setLabFilesDragData(e.dataTransfer, dragFileIds(file))
          e.dataTransfer.setData('text/plain', file.name)
        }}
      >
        {isRenaming ? (
          <Input
            autoFocus
            className="h-6 flex-1 border-[#3c3c3c] bg-[#3c3c3c] text-xs text-[#cccccc]"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => submitRename(file)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename(file)
              if (e.key === 'Escape') setRenamingFileId(null)
            }}
          />
        ) : (
          <button
            type="button"
            className={cn(
              'flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-0.5 text-left text-[13px] hover:bg-[#2a2d2e]',
              isSelected && 'bg-[#37373d]',
              isPrimary && 'bg-[#094771] text-white',
            )}
            onClick={(e) => handleFileClick(file, e)}
            onDoubleClick={() => {
              setRenamingFileId(file.id)
              setRenameValue(file.name)
            }}
          >
            <span className={fileIconColorClass(file.name)}>
              {labFileIcon(file.name, 'size-3.5')}
            </span>
            <span className="truncate">{file.name}</span>
            {file.index_status && file.index_status !== 'ready' ? (
              <span className="text-[10px] text-amber-500">{file.index_status}</span>
            ) : null}
          </button>
        )}
        <button
          type="button"
          title={t('tree.focus')}
          className={cn(
            'rounded px-1 text-[10px] opacity-0 transition group-hover:opacity-100',
            focused ? 'bg-[#007acc] text-white opacity-100' : 'text-[#858585] hover:bg-[#2a2d2e]',
          )}
          onClick={() => onToggleFocus(file.id)}
        >
          RAG
        </button>
        <button
          type="button"
          title={t('tree.rename')}
          className="rounded px-1 text-[10px] text-[#858585] opacity-0 hover:bg-[#2a2d2e] group-hover:opacity-100"
          onClick={() => {
            setRenamingFileId(file.id)
            setRenameValue(file.name)
          }}
        >
          ✎
        </button>
        <button
          type="button"
          className="rounded px-1 text-[10px] text-red-400 opacity-0 hover:underline group-hover:opacity-100"
          onClick={() => deleteMutation.mutate(file.id)}
        >
          ×
        </button>
      </div>
    )
  }

  const rootDropId = rootFolder?.id ?? 'root'

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-[#3c3c3c] bg-[#252526] text-[#cccccc]">
      <div className="shrink-0 space-y-2 border-b border-[#3c3c3c] p-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#858585]">
          {t('tree.title')}
        </p>
        <label className="block">
          <span className="sr-only">{t('tree.upload')}</span>
          <Input
            type="file"
            multiple
            className="border-[#3c3c3c] bg-[#3c3c3c] text-xs file:text-[#cccccc]"
            onChange={(e) => {
              const list = e.target.files
              if (!list) return
              uploadFilesToFolder(list, uploadFolderId)
              e.target.value = ''
            }}
          />
        </label>
        <div className="flex gap-1">
          <Input
            placeholder={t('tree.newFolder')}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="h-8 border-[#3c3c3c] bg-[#3c3c3c] text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 border-[#3c3c3c] bg-transparent hover:bg-[#2a2d2e]"
            disabled={!newFolderName.trim()}
            onClick={() => {
              createFolderMutation.mutate(
                { name: newFolderName.trim(), parent_id: uploadFolderId },
                {
                  onSuccess: (folder) => {
                    setNewFolderName('')
                    setExpanded((p) => new Set(p).add(folder.path))
                    if (folder.parent_id) {
                      const parent = (foldersQuery.data ?? []).find(
                        (f) => f.id === folder.parent_id,
                      )
                      if (parent) setExpanded((p) => new Set(p).add(parent.path))
                    }
                    setCurrentFolderId(folder.id)
                  },
                },
              )
            }}
          >
            <FolderPlus className="size-4" />
          </Button>
        </div>
        <p className="text-[10px] leading-snug text-[#858585]">{t('tree.dndHint')}</p>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
        onDragOver={(e) => {
          if (hasExternalFilesDrag(e.dataTransfer)) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
            setDropTargetFolderId(rootDropId)
          }
        }}
        onDragLeave={() => setDropTargetFolderId(null)}
        onDrop={(e) => {
          e.preventDefault()
          const labIds = readLabFilesDragData(e.dataTransfer)
          const targetId = dropTargetFolderId
          setDropTargetFolderId(null)
          if (labIds.length && rootFolder) {
            const folderId =
              targetId && targetId !== 'root' ? targetId : rootFolder.id
            moveToFolder(labIds, folderId)
            return
          }
          if (e.dataTransfer.files.length) {
            uploadFilesToFolder(e.dataTransfer.files, uploadFolderId)
          }
        }}
      >
        {rootFolder ? (
          <div
            {...folderDropHandlers(rootFolder.id)}
            className={cn(
              'mb-1 w-full rounded px-2 py-1 text-left text-xs',
              dropTargetFolderId === rootFolder.id && 'bg-[#094771] ring-1 ring-[#007acc]',
              currentFolderId === rootFolder.id &&
                dropTargetFolderId !== rootFolder.id &&
                'bg-[#37373d]',
            )}
          >
            <button
              type="button"
              className="w-full text-left hover:text-white"
              onClick={() => setCurrentFolderId(rootFolder.id)}
            >
              {t('tree.root')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="mb-1 w-full rounded px-2 py-1 text-left text-xs hover:bg-[#2a2d2e]"
            onClick={() => setCurrentFolderId(null)}
          >
            {t('tree.root')}
          </button>
        )}
        {rootFolders.map((f) => renderFolder(f, 0))}
        {rootFiles.map((f) => renderFile(f, 0))}
      </div>
      {selectedFileIds.length > 0 ? (
        <div className="shrink-0 border-t border-[#3c3c3c] px-2 py-1.5 text-[10px] text-[#858585]">
          {t('tree.selectedCount', { count: selectedFileIds.length })}
        </div>
      ) : null}
    </div>
  )
}
