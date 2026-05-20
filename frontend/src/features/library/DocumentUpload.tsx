import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { validateUploadFile } from '@/features/library/mime'
import { useUploadDocument } from '@/features/library/queries'
import { listSubjects } from '@/features/workspace/workspace-api'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Select } from '@/shared/ui/select'

type Props = {
  workspaceId: string
}

export function DocumentUpload({ workspaceId }: Props) {
  const { t } = useTranslation('library')
  const inputRef = useRef<HTMLInputElement>(null)
  const [subjectId, setSubjectId] = useState('')
  const [progress, setProgress] = useState<number | null>(null)

  const uploadMutation = useUploadDocument(workspaceId)
  const subjectsQuery = useQuery({
    queryKey: ['subjects', workspaceId],
    queryFn: () => listSubjects(workspaceId),
  })

  const busy = uploadMutation.isPending

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    const file = files[0]!
    const validation = validateUploadFile(file)
    if (!validation.ok) {
      toast.error(t(`validation.${validation.code}`))
      return
    }

    setProgress(0)
    try {
      await uploadMutation.mutateAsync({
        file,
        mimeType: validation.mimeType,
        subjectId: subjectId || undefined,
        onProgress: setProgress,
      })
      toast.success(t('upload.success'))
    } catch {
      // showApiError in mutation
    } finally {
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[160px] space-y-1.5">
          <Label htmlFor="doc-subject">{t('upload.subject')}</Label>
          <Select
            id="doc-subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={busy}
          >
            <option value="">{t('upload.subjectNone')}</option>
            {subjectsQuery.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-[200px] flex-1">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md,.markdown"
            className="hidden"
            disabled={busy}
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <Button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? t('upload.uploading') : t('upload.choose')}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">{t('upload.hint')}</p>
        </div>
      </div>
      {progress != null ? (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('upload.progress')}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
