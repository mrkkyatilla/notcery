/** VS Code–style accent colors per extension (icon tint). */
export function fileIconColorClass(name: string): string {
  const ext = name.includes('.') ? (name.split('.').pop()?.toLowerCase() ?? '') : ''
  switch (ext) {
    case 'pdf':
      return 'text-red-500'
    case 'md':
    case 'markdown':
      return 'text-sky-400'
    case 'json':
      return 'text-amber-400'
    case 'py':
      return 'text-yellow-400'
    case 'ts':
    case 'tsx':
      return 'text-blue-400'
    case 'js':
    case 'jsx':
      return 'text-yellow-300'
    case 'go':
      return 'text-cyan-400'
    case 'rs':
      return 'text-orange-400'
    case 'html':
    case 'htm':
      return 'text-orange-500'
    case 'css':
      return 'text-blue-300'
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
      return 'text-emerald-400'
    case 'csv':
    case 'xlsx':
    case 'xls':
      return 'text-green-500'
    default:
      return 'text-muted-foreground'
  }
}
