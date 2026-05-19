import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { submitAIFeedback } from '@/features/feedback/feedback-api'
import type { AIFeedbackCreate } from '@/features/feedback/feedback-api'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

type Props = {
  targetType: AIFeedbackCreate['target_type']
  targetId: string
  className?: string
}

export function AIFeedbackButtons({ targetType, targetId, className }: Props) {
  const { t } = useTranslation('billing')
  const [rating, setRating] = useState<'up' | 'down' | null>(null)
  const [pending, setPending] = useState(false)

  const send = async (value: 'up' | 'down') => {
    if (pending || rating) return
    setPending(true)
    try {
      await submitAIFeedback({
        target_type: targetType,
        target_id: targetId,
        rating: value,
      })
      setRating(value)
      toast.success(t('feedback.saved'))
    } catch {
      toast.error(t('feedback.failed'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        type="button"
        variant={rating === 'up' ? 'default' : 'ghost'}
        size="icon"
        className="size-8"
        disabled={pending || rating != null}
        aria-label={t('feedback.up')}
        onClick={() => void send('up')}
      >
        <ThumbsUp className="size-4" />
      </Button>
      <Button
        type="button"
        variant={rating === 'down' ? 'destructive' : 'ghost'}
        size="icon"
        className="size-8"
        disabled={pending || rating != null}
        aria-label={t('feedback.down')}
        onClick={() => void send('down')}
      >
        <ThumbsDown className="size-4" />
      </Button>
    </div>
  )
}
