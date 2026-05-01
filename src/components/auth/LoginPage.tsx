import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useLangStore } from '@/stores/langStore'
import t from '@/lib/i18n'

export default function LoginPage() {
  const { signInWithGoogle, signInWithMagicLink } = useAuth()
  const { lang, toggle } = useLangStore()
  const tr = t[lang].auth
  const isRTL = lang === 'he'

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Apply dir immediately on login page too
  if (typeof document !== 'undefined') {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }

  async function handleMagicLink() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await signInWithMagicLink(email.trim())
    if (error) setError(error)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700">
      {/* Lang toggle top corner */}
      <button
        onClick={toggle}
        className="fixed top-4 end-4 flex items-center gap-1 rounded-full border border-slate-500 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-300 transition-colors"
      >
        <span className={lang === 'en' ? 'text-white' : 'text-slate-500'}>EN</span>
        <span className="text-slate-600">|</span>
        <span className={lang === 'he' ? 'text-white' : 'text-slate-500'}>עב</span>
      </button>

      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md text-center space-y-6">
        <div className="space-y-2">
          <div className="text-4xl font-bold text-slate-900 tracking-tight">{tr.title}</div>
          <p className="text-slate-500 text-sm">{tr.subtitle}</p>
        </div>

        {sent ? (
          <div className="border-t pt-6 space-y-3">
            <div className="text-4xl">📧</div>
            <p className="text-slate-700 font-medium">{tr.checkEmail}</p>
            <p className="text-slate-500 text-sm">
              {tr.checkEmailDesc} <strong>{email}</strong>.<br />
              {tr.checkEmailSuffix}
            </p>
            <button onClick={() => { setSent(false); setEmail('') }} className="text-xs text-slate-400 underline">
              {tr.useDifferentEmail}
            </button>
          </div>
        ) : (
          <div className="border-t pt-6 space-y-4">
            <p className="text-slate-700 font-medium">{tr.signIn}</p>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder={tr.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMagicLink()}
              />
              <Button className="w-full" size="lg" onClick={handleMagicLink} disabled={!email.trim() || loading}>
                {loading ? tr.sending : tr.sendMagicLink}
              </Button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            <div className="flex items-center gap-3 text-slate-300 text-xs">
              <div className="flex-1 border-t" />{tr.or}<div className="flex-1 border-t" />
            </div>
            <Button onClick={signInWithGoogle} variant="outline" className="w-full flex items-center gap-3" size="lg">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {tr.continueGoogle}
            </Button>
          </div>
        )}
        <p className="text-xs text-slate-400">{tr.tagline}</p>
      </div>
    </div>
  )
}
