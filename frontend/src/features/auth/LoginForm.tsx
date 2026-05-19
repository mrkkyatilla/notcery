import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { login } from '@/features/auth/auth-api'
import { useAuthStore } from '@/features/auth/auth-store'
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton'
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas'
import { usePublicConfig } from '@/features/config/use-public-config'
import { showApiError } from '@/shared/api/show-api-error'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

export function LoginForm() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setSession = useAuthStore((s) => s.setSession)
  const { data: publicConfig } = usePublicConfig()
  const [linkMessage, setLinkMessage] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const auth = await login(values)
      setSession(auth)
      const returnUrl = searchParams.get('returnUrl')
      const target =
        returnUrl && returnUrl.startsWith('/')
          ? returnUrl
          : auth.user.onboarding_completed
            ? '/dashboard'
            : '/onboarding'
      navigate(target, { replace: true })
    } catch (error) {
      showApiError(error)
    }
  })

  const googleEnabled = publicConfig?.google_oauth.enabled

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t('login.email')}</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email ? (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('login.password')}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      {linkMessage ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {t('login.linkRequired')}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {t('login.submit')}
      </Button>

      {googleEnabled ? (
        <GoogleSignInButton
          labelKey="login.google"
          onLinkRequired={() => setLinkMessage(true)}
        />
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        {t('login.noAccount')}{' '}
        <Link to="/register" className="text-primary underline-offset-4 hover:underline">
          {t('login.registerLink')}
        </Link>
      </p>
    </form>
  )
}
