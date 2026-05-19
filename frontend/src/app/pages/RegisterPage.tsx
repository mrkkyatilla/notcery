import { useTranslation } from 'react-i18next'

import { RegisterForm } from '@/features/auth/RegisterForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

export function RegisterPage() {
  const { t } = useTranslation('auth')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('register.title')}</CardTitle>
        <CardDescription>{t('register.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  )
}
