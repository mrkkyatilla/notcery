export const MAX_UPLOAD_BYTES = 52_428_800 // 50 MB

export const MIME_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
}

export type FileValidationResult =
  | { ok: true; mimeType: string }
  | { ok: false; code: 'size' | 'extension' | 'mime_mismatch' | 'unsupported' }

export function validateUploadFile(file: File): FileValidationResult {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, code: 'size' }
  }

  const name = file.name.toLowerCase()
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot) : ''
  const expectedMime = MIME_BY_EXTENSION[ext]

  if (!expectedMime) {
    return { ok: false, code: 'unsupported' }
  }

  if (file.type && file.type !== expectedMime) {
    return { ok: false, code: 'mime_mismatch' }
  }

  return { ok: true, mimeType: expectedMime }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
