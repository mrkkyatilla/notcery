/** Match backend apps.lab.parsing.EXTENSION_MIME — extension wins over browser file.type. */
const EXTENSION_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.json': 'application/json',
  '.csv': 'text/plain',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.xml': 'text/plain',
  '.py': 'text/plain',
  '.js': 'text/plain',
  '.ts': 'text/plain',
  '.tsx': 'text/plain',
  '.jsx': 'text/plain',
  '.go': 'text/plain',
  '.rs': 'text/plain',
  '.java': 'text/plain',
  '.c': 'text/plain',
  '.cpp': 'text/plain',
  '.h': 'text/plain',
  '.sql': 'text/plain',
  '.yaml': 'text/plain',
  '.yml': 'text/plain',
  '.sh': 'text/plain',
  '.rb': 'text/plain',
  '.php': 'text/plain',
  '.swift': 'text/plain',
  '.kt': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.zip': 'application/zip',
}

export function guessLabMimeFromFilename(
  filename: string,
  declaredMime?: string,
): string {
  const dot = filename.lastIndexOf('.')
  const ext = dot >= 0 ? filename.slice(dot).toLowerCase() : ''
  if (ext in EXTENSION_MIME) return EXTENSION_MIME[ext]
  if (declaredMime && declaredMime !== 'application/octet-stream') return declaredMime
  return 'text/plain'
}

export function guessLabMimeFromFile(file: File): string {
  return guessLabMimeFromFilename(file.name, file.type || undefined)
}
