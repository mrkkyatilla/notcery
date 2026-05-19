import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { updateCurrentUser } from '@/features/auth/auth-api'
import { useAuthStore } from '@/features/auth/auth-store'
import {
  createSubject,
  createWorkspace,
} from '@/features/workspace/workspace-api'
import { useWorkspaceStore } from '@/features/workspace/workspace-store'
import { showApiError } from '@/shared/api/show-api-error'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

const TIMEZONES = Intl.supportedValuesOf('timeZone')

export function OnboardingPage() {
  const { t } = useTranslation('settings')
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId)

  const [step, setStep] = useState(0)
  const [timezone, setTimezone] = useState(user?.timezone ?? 'Europe/Istanbul')
  const [workspaceName, setWorkspaceName] = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const finish = async () => {
    if (!workspaceId || !subjectName.trim()) return
    setIsSubmitting(true)
    try {
      await createSubject(workspaceId, {
        name: subjectName.trim(),
        difficulty: 3,
        color: '#6366f1',
      })
      const updated = await updateCurrentUser({ onboarding_completed: true })
      updateUser(updated)
      setActiveWorkspaceId(workspaceId)
      toast.success(t('onboarding.finish'))
      navigate('/dashboard', { replace: true })
    } catch (error) {
      showApiError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextFromTimezone = async () => {
    setIsSubmitting(true)
    try {
      const updated = await updateCurrentUser({ timezone })
      updateUser(updated)
      setStep(1)
    } catch (error) {
      showApiError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextFromWorkspace = async () => {
    if (!workspaceName.trim()) return
    setIsSubmitting(true)
    try {
      const workspace = await createWorkspace({ name: workspaceName.trim() })
      setWorkspaceId(workspace.id)
      setStep(2)
    } catch (error) {
      showApiError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>{t('onboarding.title')}</CardTitle>
        <CardDescription>{t('onboarding.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 0 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="timezone">{t('onboarding.stepTimezone')}</Label>
              <select
                id="timezone"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={isSubmitting}
              onClick={() => void nextFromTimezone()}
            >
              {t('onboarding.next')}
            </Button>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="workspace">{t('onboarding.workspaceName')}</Label>
              <Input
                id="workspace"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={isSubmitting || !workspaceName.trim()}
              onClick={() => void nextFromWorkspace()}
            >
              {t('onboarding.next')}
            </Button>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="subject">{t('onboarding.subjectName')}</Label>
              <Input
                id="subject"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={isSubmitting || !subjectName.trim()}
              onClick={() => void finish()}
            >
              {t('onboarding.finish')}
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
