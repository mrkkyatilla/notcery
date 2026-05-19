import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuthStore } from '@/features/auth/auth-store'
import { deleteCurrentUser, exportUserData } from '@/features/settings/account-api'
import { showApiError } from '@/shared/api/show-api-error'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

export function SettingsAccountPage() {
  const { t } = useTranslation('settings')
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const [confirm, setConfirm] = useState('')
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await exportUserData()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `notcery-export-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success(t('account.exportSuccess'))
    } catch (error) {
      showApiError(error)
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async () => {
    if (confirm !== 'DELETE') return
    setDeleting(true)
    try {
      await deleteCurrentUser()
      await logout()
      navigate('/', { replace: true })
      toast.success(t('account.deleteSuccess'))
    } catch (error) {
      showApiError(error)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('account.exportTitle')}</CardTitle>
          <CardDescription>{t('account.exportSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" disabled={exporting} onClick={() => void handleExport()}>
            {exporting ? t('account.exporting') : t('account.export')}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>{t('account.deleteTitle')}</CardTitle>
          <CardDescription>{t('account.deleteSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">{t('account.deleteConfirmLabel')}</Label>
            <Input
              id="delete-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting || confirm !== 'DELETE'}
            onClick={() => void handleDelete()}
          >
            {deleting ? t('account.deleting') : t('account.delete')}
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {t('account.legalLinks')}{' '}
        <a href="/privacy" className="underline">
          {t('account.privacy')}
        </a>
        {' · '}
        <a href="/terms" className="underline">
          {t('account.terms')}
        </a>
      </p>
    </div>
  )
}
