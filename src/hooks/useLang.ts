import { useEffect } from 'react'
import { useLangStore } from '@/stores/langStore'
import t from '@/lib/i18n'

export function useLang() {
  const { lang, toggle } = useLangStore()
  const tr = t[lang]
  const isRTL = lang === 'he'

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang, isRTL])

  return { lang, tr, isRTL, toggle }
}
