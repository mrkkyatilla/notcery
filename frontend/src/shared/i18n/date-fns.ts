import { enUS, tr } from 'date-fns/locale'

import type { Locale } from '@/shared/api/locale'

export function getDateFnsLocale(locale: Locale) {
  return locale === 'en' ? enUS : tr
}
