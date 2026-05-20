import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LabCitationCard } from '@/features/lab/components/LabCitationCard'
import { StructuredResultView } from '@/features/lab/components/StructuredResultView'
import { MarkdownMessage } from '@/features/chat/components/MarkdownMessage'
import {
  useLabMessages,
  useLabSession,
  useResetLabSession,
  useSendLabMessage,
  type LabAgentContext,
} from '@/features/lab/queries'
import type { LabOutputMode } from '@/features/lab/types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'
import { cn } from '@/shared/lib/utils'

type Props = {
  workspaceId: string
  focusedFileIds: string[]
  onOpenFile: (fileId: string) => void
}

export function LabAgentChat({ workspaceId, focusedFileIds, onOpenFile }: Props) {
  const { t } = useTranslation('lab')
  const sessionQuery = useLabSession(workspaceId)
  const sessionId = sessionQuery.data?.id
  const [useRag, setUseRag] = useState(true)
  const [outputMode, setOutputMode] = useState<LabOutputMode>('free')
  const [input, setInput] = useState('')

  const ctx: LabAgentContext = {
    useRag,
    outputMode,
    activeFileIds: focusedFileIds,
  }

  const messagesQuery = useLabMessages(sessionId)
  const sendMutation = useSendLabMessage(workspaceId, sessionId, ctx)
  const resetMutation = useResetLabSession(workspaceId)

  const handleSend = () => {
    const text = input.trim()
    if (!text || !sessionId) return
    setInput('')
    void sendMutation.mutateAsync(text)
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col text-[#cccccc]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#3c3c3c] px-3 py-2">
        <div>
          <h2 className="text-sm font-semibold">{t('chat.title')}</h2>
          {sessionId ? (
            <p className="text-[10px] text-[#858585]">
              {t('chat.session', { id: sessionId.slice(0, 8) })}
            </p>
          ) : (
            <Skeleton className="mt-1 h-3 w-24 bg-[#3c3c3c]" />
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 border-[#3c3c3c] bg-transparent text-xs hover:bg-[#2a2d2e]"
          disabled={resetMutation.isPending}
          onClick={() => resetMutation.mutate()}
        >
          {t('chat.newSession')}
        </Button>
      </div>

      <div className="flex shrink-0 flex-wrap gap-3 border-b border-[#3c3c3c] px-3 py-2 text-xs">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useRag}
            onChange={(e) => setUseRag(e.target.checked)}
          />
          {t('chat.useRag')}
        </label>
        <div className="flex items-center gap-2">
          <Label htmlFor="output-mode">{t('chat.outputMode')}</Label>
          <Select
            id="output-mode"
            value={outputMode}
            onChange={(e) => setOutputMode(e.target.value as LabOutputMode)}
            className="h-8 w-40 text-xs"
          >
            <option value="free">{t('chat.modeFree')}</option>
            <option value="risk_matrix">{t('chat.modeRisk')}</option>
            <option value="comparison_table">{t('chat.modeCompare')}</option>
          </Select>
        </div>
        {focusedFileIds.length ? (
          <span className="text-[#858585]">
            {t('chat.focusCount', { count: focusedFileIds.length })}
          </span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
        {!messagesQuery.data?.length ? (
          <p className="text-sm text-[#858585]">{t('chat.empty')}</p>
        ) : (
          messagesQuery.data.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'max-w-[95%] rounded-lg px-3 py-2 text-sm',
                msg.role === 'user'
                  ? 'ml-auto bg-[#007acc] text-white'
                  : 'border border-[#3c3c3c] bg-[#1e1e1e]',
              )}
            >
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <>
                  <MarkdownMessage content={msg.content} />
                  <StructuredResultView
                    mode={outputMode}
                    data={msg.structured_result as Record<string, unknown> | null}
                  />
                  {msg.citations?.length ? (
                    <div className="mt-2 space-y-1 border-t pt-2">
                      <p className="text-xs font-medium text-[#858585]">
                        {t('chat.sources')}
                      </p>
                      {msg.citations.map((c, i) => (
                        <LabCitationCard
                          key={c.lab_file_id ?? i}
                          citation={c}
                          onOpen={onOpenFile}
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ))
        )}
        {sendMutation.isPending ? (
          <p className="text-xs text-[#858585]">{t('chat.thinking')}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-2 border-t border-[#3c3c3c] p-3">
        <Input
          value={input}
          placeholder={t('chat.placeholder')}
          disabled={!sessionId || sendMutation.isPending}
          className="border-[#3c3c3c] bg-[#3c3c3c] text-[#cccccc]"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <Button
          type="button"
          className="shrink-0 bg-[#007acc] hover:bg-[#0062a3]"
          disabled={!sessionId || sendMutation.isPending || !input.trim()}
          onClick={handleSend}
        >
          {t('chat.send')}
        </Button>
      </div>
    </div>
  )
}
