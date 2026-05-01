import { useLangStore } from '@/stores/langStore'
import { cn } from '@/lib/utils'

export function LangToggle({ className }: { className?: string }) {
  const { lang, toggle } = useLangStore()

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex items-center gap-1 rounded-full border border-slate-600 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:border-slate-400 hover:text-white transition-colors select-none',
        className,
      )}
      title={lang === 'en' ? 'Switch to Hebrew' : 'Switch to English'}
    >
      <span className={lang === 'en' ? 'text-white' : 'text-slate-500'}>EN</span>
      <span className="text-slate-600">|</span>
      <span className={lang === 'he' ? 'text-white' : 'text-slate-500'}>עב</span>
    </button>
  )
}
