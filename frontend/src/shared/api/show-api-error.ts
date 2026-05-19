import { toast } from 'sonner'

import { ApiError } from '@/shared/api/errors'
import i18n from '@/shared/i18n'

export function showApiError(error: unknown): void {
  if (!(error instanceof ApiError)) {
    toast.error(i18n.t('errors:UNKNOWN.message'))
    return
  }

  if (String(error.code) === 'QUOTA_EXCEEDED') {
    const details = error.details
    const metric = details?.metric
    const upgradeAction = {
      label: i18n.t('actions.upgrade', { ns: 'billing' }),
      onClick: () => {
        window.location.href = '/settings/billing'
      },
    }

    if (metric === 'storage_bytes') {
      toast.error(
        i18n.t('QUOTA_EXCEEDED.storage', {
          ns: 'errors',
          limit_mb: String(details?.limit_mb ?? '—'),
          used_mb: String(details?.used_mb ?? '—'),
        }),
        { action: upgradeAction },
      )
      return
    }
    if (metric === 'plan_generate') {
      toast.error(
        i18n.t('QUOTA_EXCEEDED.plan', {
          ns: 'errors',
          limit: String(details?.limit ?? '—'),
          used: String(details?.used ?? '—'),
        }),
        { action: upgradeAction },
      )
      return
    }
    if (metric === 'chat_message') {
      toast.error(
        i18n.t('QUOTA_EXCEEDED.chat', {
          ns: 'errors',
          limit: String(details?.limit ?? '—'),
          used: String(details?.used ?? '—'),
        }),
        { action: upgradeAction },
      )
      return
    }
    toast.error(i18n.t('QUOTA_EXCEEDED.message', { ns: 'errors', defaultValue: error.message }), {
      action: upgradeAction,
    })
    return
  }

  const translated = i18n.t(`${error.code}.message`, {
    ns: 'errors',
    defaultValue: '',
  })

  toast.error(translated || error.message)
}
