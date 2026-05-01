import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '@/lib/i18n'

interface LangState {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
}

export const useLangStore = create<LangState>()(
  persist(
    (set, get) => ({
      lang: 'he',
      setLang: (lang) => set({ lang }),
      toggle: () => set({ lang: get().lang === 'en' ? 'he' : 'en' }),
    }),
    { name: 'autocrm-lang' },
  ),
)
