export const LAB_FILES_DRAG_TYPE = 'application/x-notcery-lab-files'

export function setLabFilesDragData(dataTransfer: DataTransfer, fileIds: string[]) {
  dataTransfer.setData(LAB_FILES_DRAG_TYPE, JSON.stringify(fileIds))
  dataTransfer.effectAllowed = 'move'
}

export function readLabFilesDragData(dataTransfer: DataTransfer): string[] {
  const raw = dataTransfer.getData(LAB_FILES_DRAG_TYPE)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function hasLabFilesDrag(dataTransfer: DataTransfer): boolean {
  return dataTransfer.types.includes(LAB_FILES_DRAG_TYPE)
}

export function hasExternalFilesDrag(dataTransfer: DataTransfer): boolean {
  return [...dataTransfer.types].includes('Files')
}
