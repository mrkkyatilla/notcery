import type { LabFile, LabFolder } from '@/features/lab/types'

type TreeMaps = {
  childrenByParent: Map<string | null, LabFolder[]>
  filesByFolder: Map<string | null, LabFile[]>
}

/** Flat file list in explorer display order (for Shift+click range selection). */
export function collectFilesInTreeOrder(
  rootFolder: LabFolder | undefined,
  tree: TreeMaps,
  expanded: Set<string>,
): LabFile[] {
  const result: LabFile[] = []

  const visitFolder = (folder: LabFolder) => {
    const files = tree.filesByFolder.get(folder.id) ?? []
    for (const file of files) result.push(file)
    if (!expanded.has(folder.path)) return
    const childFolders = tree.childrenByParent.get(folder.id) ?? []
    for (const child of childFolders) visitFolder(child)
  }

  if (rootFolder) {
    visitFolder(rootFolder)
  }

  const orphanFolders = tree.childrenByParent.get(null) ?? []
  for (const folder of orphanFolders) visitFolder(folder)

  return result
}

export function rangeSelectIds(
  flatFiles: LabFile[],
  anchorId: string,
  targetId: string,
): string[] {
  const anchorIdx = flatFiles.findIndex((f) => f.id === anchorId)
  const targetIdx = flatFiles.findIndex((f) => f.id === targetId)
  if (anchorIdx < 0 || targetIdx < 0) return [targetId]
  const start = Math.min(anchorIdx, targetIdx)
  const end = Math.max(anchorIdx, targetIdx)
  return flatFiles.slice(start, end + 1).map((f) => f.id)
}
