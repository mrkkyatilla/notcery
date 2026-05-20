import { ChevronDown, ChevronRight, FolderPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { fileIconColorClass } from '@/features/lab/file-icon-colors'
import { folderIcon, labFileIcon } from '@/features/lab/file-icons'
import {
  useCreateLabFolder,
  useDeleteLabFile,
  useLabFiles,
  useLabFolders,
  useUpdateLabFile,
  useUploadLabFile,
} from '@/features/lab/queries'
import type { LabFile, LabFolder } from '@/features/lab/types'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'

type Props = {
  workspaceId: string
  selectedFileId: string | null
  focusedFileIds: string[]
  onSelectFile: (file: LabFile) => void
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
  selectedFileId,
  focusedFileIds,
  onSelectFile,
  onToggleFocus,
}: Props) {
  const { t } = useTranslation('lab')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['/']))
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [moveFileId, setMoveFileId] = useState<string | null>(null)
  const foldersQuery = useLabFolders(workspaceId)
  const filesQuery = useLabFiles(workspaceId, null)
  const createFolderMutation = useCreateLabFolder(workspaceId)
  const deleteMutation = useDeleteLabFile(workspaceId)
  const updateFileMutation = useUpdateLabFile(workspaceId)
  const [newFolderName, setNewFolderName] = useState('')

  const tree = useMemo(
    () => buildTree(foldersQuery.data ?? [], filesQuery.data ?? []),
    [foldersQuery.data, filesQuery.data],
  )

  const rootFolder = (foldersQuery.data ?? []).find((f) => f.path === '/')
  const uploadFolderId = currentFolderId ?? rootFolder?.id ?? null
  const uploadMutationToFolder = useUploadLabFile(workspaceId, uploadFolderId)

  const rootFolders = rootFolder
    ? tree.childrenByParent.get(rootFolder.id) ?? []
    : tree.childrenByParent.get(null) ?? []
  const rootFiles = rootFolder ? (tree.filesByFolder.get(rootFolder.id) ?? []) : []

  const folderOptions = (foldersQuery.data ?? []).filter(
    (f) => f.path !== '/' && f.path !== '/artifacts',
  )

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

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
    const childFolders = tree.childrenByParent.get(folder.id) ?? []
    const childFiles = tree.filesByFolder.get(folder.id) ?? []

    return (
      <div key={folder.id}>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-0.5 rounded px-1 py-0.5 text-left text-[13px] hover:bg-[#2a2d2e]',
            currentFolderId === folder.id && 'bg-[#37373d]',
          )}
          style={{ paddingLeft: depth * 12 + 4 }}
          onClick={() => {
            toggleExpand(folder.path)
            setCurrentFolderId(folder.id)
          }}
        >
          <span className="text-[#858585]">
            {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </span>
          <span className="text-amber-400/90">{folderIcon()}</span>
          <span className="truncate text-[#cccccc]">{folder.name}</span>
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
    const isRenaming = renamingFileId === file.id

    return (
      <div
        key={file.id}
        className="group flex items-center gap-0.5 pr-1"
        style={{ paddingLeft: depth * 12 + 20 }}
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
              selectedFileId === file.id && 'bg-[#094771] text-white',
            )}
            onClick={() => onSelectFile(file)}
            onDoubleClick={() => {
              setRenamingFileId(file.id)
              setRenameValue(file.name)
            }}
          >
            <span className={fileIconColorClass(file.name)}>{labFileIcon(file.name, 'size-3.5')}</span>
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

  return (
    <div className="flex h-full flex-col border-r border-[#3c3c3c] bg-[#252526] text-[#cccccc]">
      <div className="space-y-2 border-b border-[#3c3c3c] p-2">
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
              Array.from(list).forEach((f) => uploadMutationToFolder.mutate(f))
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
                {
                  name: newFolderName.trim(),
                  parent_id: uploadFolderId,
                },
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
        {moveFileId ? (
          <div className="space-y-1">
            <p className="text-[10px] text-[#858585]">{t('tree.moveTo')}</p>
            <Select
              className="h-8 border-[#3c3c3c] bg-[#3c3c3c] text-xs"
              defaultValue=""
              onChange={(e) => {
                const folderId = e.target.value
                if (!folderId) return
                updateFileMutation.mutate(
                  { fileId: moveFileId, folder_id: folderId },
                  { onSuccess: () => setMoveFileId(null) },
                )
              }}
            >
              <option value="">{t('tree.pickFolder')}</option>
              {rootFolder ? <option value={rootFolder.id}>{t('tree.root')}</option> : null}
              {folderOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.path}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setMoveFileId(null)}
            >
              {t('tree.cancel')}
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        <button
          type="button"
          className={cn(
            'mb-1 w-full rounded px-2 py-1 text-left text-xs hover:bg-[#2a2d2e]',
            currentFolderId === null && 'bg-[#37373d]',
          )}
          onClick={() => setCurrentFolderId(rootFolder?.id ?? null)}
        >
          {t('tree.root')}
        </button>
        {rootFolders.map((f) => renderFolder(f, 0))}
        {rootFiles.map((f) => renderFile(f, 0))}
      </div>
      {selectedFileId ? (
        <div className="border-t border-[#3c3c3c] p-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-[#3c3c3c] text-xs"
            onClick={() => setMoveFileId(selectedFileId)}
          >
            {t('tree.moveSelected')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
