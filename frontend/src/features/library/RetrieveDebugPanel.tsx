import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useRetrieveDebug } from '@/features/library/queries'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

type Props = {
  workspaceId: string
}

export function RetrieveDebugPanel({ workspaceId }: Props) {
  const { t } = useTranslation('library')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(8)
  const retrieveMutation = useRetrieveDebug(workspaceId)

  if (!import.meta.env.DEV) {
    return null
  }

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        {t('retrieve.title')}
        <span className="text-muted-foreground">{open ? '−' : '+'}</span>
      </button>
      {open ? (
        <div className="space-y-3 border-t px-4 pb-4 pt-3">
          <p className="text-xs text-muted-foreground">{t('retrieve.hint')}</p>
          <div className="space-y-1.5">
            <Label htmlFor="retrieve-query">{t('retrieve.query')}</Label>
            <Input
              id="retrieve-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('retrieve.queryPlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="retrieve-topk">{t('retrieve.topK')}</Label>
            <Input
              id="retrieve-topk"
              type="number"
              min={1}
              max={20}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value) || 8)}
            />
          </div>
          <Button
            type="button"
            disabled={!query.trim() || retrieveMutation.isPending}
            onClick={() =>
              retrieveMutation.mutate({
                query: query.trim(),
                top_k: topK,
                source_types: ['document', 'note'],
              })
            }
          >
            {retrieveMutation.isPending ? t('retrieve.running') : t('retrieve.run')}
          </Button>
          {retrieveMutation.data?.results?.length ? (
            <ul className="max-h-64 space-y-2 overflow-y-auto text-xs">
              {retrieveMutation.data.results.map((chunk, i) => (
                <li key={chunk.id ?? i} className="rounded border p-2">
                  <div className="mb-1 font-medium text-muted-foreground">
                    {chunk.source_type} · score {chunk.score?.toFixed(3) ?? '—'}
                  </div>
                  <p className="whitespace-pre-wrap">{chunk.excerpt ?? chunk.text}</p>
                </li>
              ))}
            </ul>
          ) : retrieveMutation.isSuccess ? (
            <p className="text-xs text-muted-foreground">{t('retrieve.noResults')}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
