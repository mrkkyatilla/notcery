import {
  File,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType,
  Folder,
} from 'lucide-react'

export function labFileIcon(name: string, className = 'size-4 shrink-0') {
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : ''
  switch (ext) {
    case 'pdf':
      return <FileType className={className} />
    case 'md':
    case 'markdown':
    case 'txt':
      return <FileText className={className} />
    case 'json':
      return <FileJson className={className} />
    case 'csv':
    case 'xlsx':
    case 'xls':
      return <FileSpreadsheet className={className} />
    case 'py':
    case 'js':
    case 'ts':
    case 'tsx':
    case 'jsx':
    case 'go':
    case 'rs':
    case 'java':
    case 'html':
    case 'css':
      return <FileCode2 className={className} />
    default:
      return <File className={className} />
  }
}

export function folderIcon(className = 'size-4 shrink-0') {
  return <Folder className={className} />
}
