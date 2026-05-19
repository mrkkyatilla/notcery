import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { joinWaitlist } from '@/features/growth/waitlist-api'
import { getStoredLocale } from '@/shared/api/locale'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

type Props = {
  compact?: boolean
}

export function WaitlistForm({ compact }: Props) {
  const { t } = useTranslation('landing')
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return
    setPending(true)
    try {
      const result = await joinWaitlist({
        email: email.trim(),
        locale: getStoredLocale(),
      })
      toast.success(result.created ? t('waitlist.success') : t('waitlist.duplicate'))
      if (result.created) setEmail('')
    } catch {
      toast.error(t('waitlist.error'))
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className={compact ? 'flex flex-col gap-2 sm:flex-row' : 'mx-auto max-w-md space-y-3'}
    >
      {!compact ? (
        <Label htmlFor="waitlist-email" className="sr-only">
          {t('waitlist.email')}
        </Label>
      ) : null}
      <Input
        id="waitlist-email"
        type="email"
        required
        placeholder={t('waitlist.emailPlaceholder')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={pending}
        className={compact ? 'flex-1' : undefined}
      />
      <Button type="submit" disabled={pending} className={compact ? 'shrink-0' : 'w-full'}>
        {pending ? t('waitlist.submitting') : t('waitlist.submit')}
      </Button>
    </form>
  )
}
