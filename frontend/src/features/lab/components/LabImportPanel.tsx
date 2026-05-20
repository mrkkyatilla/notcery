import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { createLabUploadUrl } from '@/features/lab/lab-api'
import { guessLabMimeFromFile } from '@/features/lab/guess-mime'
import { startLabImportGit, startLabImportZip } from '@/features/lab/lab-import-api'
import { useLabImportStatus } from '@/features/lab/queries-import'
import { uploadToPresignedUrl } from '@/features/library/upload-to-presigned'
import { showApiError } from '@/shared/api/show-api-error'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'

type Props = {
  workspaceId: string
  uploadFolderId: string | null
  onImportDone: () => void
}

export function LabImportPanel({ workspaceId, uploadFolderId, onImportDone }: Props) {
  const { t } = useTranslation('lab')
  const [activeImportId, setActiveImportId] = useState<string | null>(null)
  const [gitUrl, setGitUrl] = useState('')
  const [gitBranch, setGitBranch] = useState('')
  const [gitLabel, setGitLabel] = useState('')
  const [showGit, setShowGit] = useState(false)
  const [busy, setBusy] = useState(false)
  const handledTerminal = useRef<string | null>(null)

  const importQuery = useLabImportStatus(activeImportId)

  useEffect(() => {
    const status = importQuery.data?.status
    if (!status || !activeImportId) return
    if (!['completed', 'failed', 'cancelled'].includes(status)) return
    if (handledTerminal.current === activeImportId) return
    handledTerminal.current = activeImportId

    if (status === 'completed') {
      toast.success(t('import.completed'))
      onImportDone()
    } else {
      toast.error(importQuery.data?.error_message || t('import.failed'))
    }
    setActiveImportId(null)
  }, [importQuery.data?.status, importQuery.data?.error_message, activeImportId, onImportDone, t])

  const stats = importQuery.data?.stats
  const isRunning =
    importQuery.data?.status === 'pending' || importQuery.data?.status === 'running'

  const uploadZip = async (file: File) => {
    setBusy(true)
    try {
      const mimeType = guessLabMimeFromFile(file)
      const presign = await createLabUploadUrl(workspaceId, {
        filename: file.name,
        mime_type: mimeType,
        size_bytes: file.size,
      })
      await uploadToPresignedUrl(presign.upload_url, file, mimeType)
      const job = await startLabImportZip(workspaceId, {
        file_key: presign.file_key,
        original_filename: file.name,
        size_bytes: file.size,
        parent_folder_id: uploadFolderId ?? undefined,
        label: file.name.replace(/\.zip$/i, ''),
      })
      handledTerminal.current = null
      setActiveImportId(job.id)
      toast.info(t('import.started'))
    } catch (e) {
      showApiError(e)
    } finally {
      setBusy(false)
    }
  }

  const submitGit = async () => {
    const url = gitUrl.trim()
    if (!url) return
    setBusy(true)
    try {
      const job = await startLabImportGit(workspaceId, {
        url,
        branch: gitBranch.trim() || undefined,
        parent_folder_id: uploadFolderId ?? undefined,
        label: gitLabel.trim() || undefined,
      })
      handledTerminal.current = null
      setActiveImportId(job.id)
      setShowGit(false)
      setGitUrl('')
      setGitBranch('')
      setGitLabel('')
      toast.info(t('import.started'))
    } catch (e) {
      showApiError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 border-b border-[#3c3c3c] pb-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#858585]">
        {t('import.title')}
      </p>
      <label className="block">
        <span className="sr-only">{t('import.zip')}</span>
        <Input
          type="file"
          accept=".zip,application/zip"
          disabled={busy || isRunning}
          className="border-[#3c3c3c] bg-[#3c3c3c] text-xs file:text-[#cccccc]"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void uploadZip(f)
            e.target.value = ''
          }}
        />
      </label>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 w-full border-[#3c3c3c] bg-transparent text-xs hover:bg-[#2a2d2e]"
        disabled={busy || isRunning}
        onClick={() => setShowGit((v) => !v)}
      >
        {showGit ? t('import.hideGit') : t('import.git')}
      </Button>
      {showGit ? (
        <div className="space-y-1.5 rounded border border-[#3c3c3c] bg-[#1e1e1e] p-2">
          <Input
            placeholder={t('import.gitUrl')}
            value={gitUrl}
            onChange={(e) => setGitUrl(e.target.value)}
            className="h-8 border-[#3c3c3c] bg-[#3c3c3c] text-xs"
          />
          <Input
            placeholder={t('import.gitBranch')}
            value={gitBranch}
            onChange={(e) => setGitBranch(e.target.value)}
            className="h-8 border-[#3c3c3c] bg-[#3c3c3c] text-xs"
          />
          <Input
            placeholder={t('import.gitLabel')}
            value={gitLabel}
            onChange={(e) => setGitLabel(e.target.value)}
            className="h-8 border-[#3c3c3c] bg-[#3c3c3c] text-xs"
          />
          <Button
            type="button"
            size="sm"
            className="h-7 w-full bg-[#007acc] text-xs hover:bg-[#0062a3]"
            disabled={busy || isRunning || !gitUrl.trim()}
            onClick={() => void submitGit()}
          >
            {t('import.gitSubmit')}
          </Button>
        </div>
      ) : null}
      {isRunning && importQuery.data ? (
        <div className={cn('rounded bg-[#1e1e1e] px-2 py-1.5 text-[10px] text-[#858585]')}>
          <p>{t('import.progress', { status: importQuery.data.status })}</p>
          {stats ? (
            <p>
              {t('import.stats', {
                imported: stats.imported ?? 0,
                total: stats.total_candidates ?? 0,
                skipped: stats.skipped ?? 0,
              })}
            </p>
          ) : null}
        </div>
      ) : null}
      <p className="text-[10px] leading-snug text-[#858585]">{t('import.hint')}</p>
    </div>
  )
}
