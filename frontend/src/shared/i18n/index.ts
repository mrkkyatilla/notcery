import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { normalizeLocale, setStoredLocale, type Locale } from '@/shared/api/locale'

import enAuth from '../../../locales/en/auth.json'
import enCommon from '../../../locales/en/common.json'
import enErrors from '../../../locales/en/errors.json'
import enAiPlan from '../../../locales/en/aiPlan.json'
import enBilling from '../../../locales/en/billing.json'
import enChat from '../../../locales/en/chat.json'
import enLab from '../../../locales/en/lab.json'
import enLanding from '../../../locales/en/landing.json'
import enLibrary from '../../../locales/en/library.json'
import enNotes from '../../../locales/en/notes.json'
import enPlanner from '../../../locales/en/planner.json'
import enSettings from '../../../locales/en/settings.json'
import trAuth from '../../../locales/tr/auth.json'
import trCommon from '../../../locales/tr/common.json'
import trErrors from '../../../locales/tr/errors.json'
import trAiPlan from '../../../locales/tr/aiPlan.json'
import trBilling from '../../../locales/tr/billing.json'
import trChat from '../../../locales/tr/chat.json'
import trLab from '../../../locales/tr/lab.json'
import trLanding from '../../../locales/tr/landing.json'
import trLibrary from '../../../locales/tr/library.json'
import trNotes from '../../../locales/tr/notes.json'
import trPlanner from '../../../locales/tr/planner.json'
import trSettings from '../../../locales/tr/settings.json'

export const defaultNS = 'common'
export const namespaces = [
  'common',
  'auth',
  'settings',
  'billing',
  'landing',
  'errors',
  'planner',
  'notes',
  'library',
  'chat',
  'lab',
  'aiPlan',
] as const

export const resources = {
  tr: {
    common: trCommon,
    auth: trAuth,
    settings: trSettings,
    billing: trBilling,
    landing: trLanding,
    errors: trErrors,
    planner: trPlanner,
    notes: trNotes,
    library: trLibrary,
    chat: trChat,
    lab: trLab,
    aiPlan: trAiPlan,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    settings: enSettings,
    billing: enBilling,
    landing: enLanding,
    errors: enErrors,
    planner: enPlanner,
    notes: enNotes,
    library: enLibrary,
    chat: enChat,
    lab: enLab,
    aiPlan: enAiPlan,
  },
} as const

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'tr'
  const stored = localStorage.getItem('notcery_locale')
  if (stored) return normalizeLocale(stored)
  return normalizeLocale(navigator.language)
}

const initialLocale = detectInitialLocale()

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: 'tr',
  defaultNS,
  ns: [...namespaces],
  interpolation: { escapeValue: false },
})

document.documentElement.lang = initialLocale

i18n.on('languageChanged', (lng) => {
  const locale = normalizeLocale(lng)
  document.documentElement.lang = locale
  setStoredLocale(locale)
})

export function changeAppLanguage(locale: Locale): void {
  void i18n.changeLanguage(locale)
}

export function translateApiError(code: string, fallback: string): string {
  const key = `errors:${code}.message`
  const translated = i18n.t(key, { defaultValue: '' })
  return translated || fallback
}

export default i18n
