import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { usePublicConfig } from '@/features/config/use-public-config'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

type Props = {
  disabled?: boolean
  isSending?: boolean
  noteId?: string | null
  useRag: boolean
  useGrounding: boolean
  onUseRagChange: (value: boolean) => void
  onUseGroundingChange: (value: boolean) => void
  onSend: (content: string) => void
}

export function ChatComposer({
  disabled,
  isSending,
  noteId,
  useRag,
  useGrounding,
  onUseRagChange,
  onUseGroundingChange,
  onSend,
}: Props) {
  const { t } = useTranslation('chat')
  const [draft, setDraft] = useState('')
  const configQuery = usePublicConfig()
  const groundingEnabled = Boolean(configQuery.data?.feature_flags?.ai_grounding)

  const submit = () => {
    const text = draft.trim()
    if (!text || disabled || isSending) return
    onSend(text)
    setDraft('')
  }

  return (
    <div className="space-y-2 border-t p-3">
      <div className="flex flex-wrap gap-3 text-xs">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={useRag}
            onChange={(e) => onUseRagChange(e.target.checked)}
            disabled={disabled || isSending}
          />
          {t('context.useRag')}
        </label>
        {groundingEnabled ? (
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={useGrounding}
              onChange={(e) => onUseGroundingChange(e.target.checked)}
              disabled={disabled || isSending}
            />
            {t('context.useGrounding')}
          </label>
        ) : null}
      </div>

      {noteId ? (
        <Label className="text-xs text-muted-foreground">{t('context.noteLinked')}</Label>
      ) : null}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('inputPlaceholder')}
          disabled={disabled || isSending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <Button type="button" disabled={disabled || isSending || !draft.trim()} onClick={submit}>
          {isSending ? t('sending') : t('send')}
        </Button>
      </div>
    </div>
  )
}
