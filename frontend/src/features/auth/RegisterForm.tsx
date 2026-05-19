import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import { register as registerApi } from '@/features/auth/auth-api'
import { useAuthStore } from '@/features/auth/auth-store'
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton'
import { registerSchema, type RegisterFormValues } from '@/features/auth/schemas'
import { usePublicConfig } from '@/features/config/use-public-config'
import { WaitlistForm } from '@/features/growth/WaitlistForm'
import { getStoredLocale } from '@/shared/api/locale'
import { showApiError } from '@/shared/api/show-api-error'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

export function RegisterForm() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const { data: publicConfig } = usePublicConfig()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const auth = await registerApi({
        ...values,
        locale: getStoredLocale(),
      })
      setSession(auth)
      navigate('/onboarding', { replace: true })
    } catch (error) {
      showApiError(error)
    }
  })

  const googleEnabled = publicConfig?.google_oauth.enabled
  const closedBeta = Boolean(publicConfig?.feature_flags?.closed_beta)

  if (closedBeta) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('register.closedBeta')}</p>
        <WaitlistForm compact />
        <p className="text-center text-sm text-muted-foreground">
          {t('register.hasAccount')}{' '}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            {t('register.loginLink')}
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="display_name">{t('register.displayName')}</Label>
        <Input id="display_name" autoComplete="name" {...register('display_name')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t('register.email')}</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email ? (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('register.password')}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {t('register.submit')}
      </Button>

      {googleEnabled ? <GoogleSignInButton labelKey="register.google" /> : null}

      <p className="text-center text-sm text-muted-foreground">
        {t('register.hasAccount')}{' '}
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          {t('register.loginLink')}
        </Link>
      </p>
    </form>
  )
}
