import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { loginWithGoogle } from '@/features/auth/auth-api'
import { useAuthStore } from '@/features/auth/auth-store'
import { ApiError } from '@/shared/api/errors'
import { showApiError } from '@/shared/api/show-api-error'
import { getStoredLocale } from '@/shared/api/locale'

type Props = {
  labelKey: 'login.google' | 'register.google'
  onLinkRequired?: () => void
}

export function GoogleSignInButton({ labelKey, onLinkRequired }: Props) {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return
    try {
      const auth = await loginWithGoogle({
        id_token: response.credential,
        locale: getStoredLocale(),
      })
      setSession(auth)
      navigate(auth.user.onboarding_completed ? '/dashboard' : '/onboarding', {
        replace: true,
      })
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === 'ACCOUNT_EXISTS_LINK_REQUIRED'
      ) {
        onLinkRequired?.()
        showApiError(error)
        return
      }
      showApiError(error)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => showApiError(new ApiError(401, {
          error: { code: 'GOOGLE_TOKEN_INVALID', message: 'Google sign-in failed' },
        }))}
        text="continue_with"
        shape="rectangular"
        width={380}
      />
      <p className="text-center text-xs text-muted-foreground">{t(labelKey)}</p>
    </div>
  )
}
