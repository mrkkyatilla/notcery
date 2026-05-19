import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { updateCurrentUser } from '@/features/auth/auth-api'
import { useAuthStore } from '@/features/auth/auth-store'
import { LocaleThemeControls } from '@/features/settings/LocaleThemeControls'
import { showApiError } from '@/shared/api/show-api-error'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

const profileSchema = z.object({
  display_name: z.string().max(120).optional(),
  timezone: z.string().min(1),
})

type ProfileFormValues = z.infer<typeof profileSchema>

const TIMEZONES = Intl.supportedValuesOf('timeZone')

export function SettingsProfilePage() {
  const { t } = useTranslation('settings')
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      display_name: user?.display_name ?? '',
      timezone: user?.timezone ?? 'UTC',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await updateCurrentUser({
        display_name: values.display_name || undefined,
        timezone: values.timezone,
      })
      updateUser(updated)
      toast.success(t('profile.saved'))
    } catch (error) {
      showApiError(error)
    }
  })

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.title')}</CardTitle>
          <CardDescription>{t('profile.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">{t('profile.displayName')}</Label>
              <Input id="display_name" {...register('display_name')} />
            </div>

            <LocaleThemeControls layout="form" />

            <div className="space-y-2">
              <Label htmlFor="timezone">{t('profile.timezone')}</Label>
              <select
                id="timezone"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                {...register('timezone')}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {t('profile.save')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
