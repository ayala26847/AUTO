import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useLangStore } from '@/stores/langStore'
import t from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { Organization, User } from '@/types'

export default function OnboardingPage() {
  const { setUser, setOrganization } = useAuthStore()
  const { lang } = useLangStore()
  const tr = t[lang].onboarding

  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [orgName, setOrgName] = useState('')
  const [userName, setUserName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!userName.trim()) return
    if (mode === 'create' && !orgName.trim()) return
    if (mode === 'join' && !joinCode.trim()) return

    setLoading(true)
    setError('')
    try {
      const params =
        mode === 'create'
          ? { p_org_name: orgName.trim(), p_user_name: userName.trim() }
          : { p_join_code: joinCode.trim().toUpperCase(), p_user_name: userName.trim() }

      const { data, error: rpcError } = await supabase.rpc('setup_workspace', params)
      if (rpcError) throw new Error(rpcError.message)
      const result = data as { organization: Organization; user: User }
      setOrganization(result.organization)
      setUser(result.user)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : JSON.stringify(e))
    } finally {
      setLoading(false)
    }
  }

  const isDisabled =
    loading ||
    !userName.trim() ||
    (mode === 'create' ? !orgName.trim() : !joinCode.trim())

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{tr.title}</CardTitle>
          <CardDescription>{tr.subtitle}</CardDescription>
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden mt-2">
            <button
              className={`flex-1 py-1.5 text-sm font-medium transition-colors ${mode === 'create' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
              onClick={() => { setMode('create'); setError('') }}
            >
              {tr.createNew}
            </button>
            <button
              className={`flex-1 py-1.5 text-sm font-medium transition-colors ${mode === 'join' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
              onClick={() => { setMode('join'); setError('') }}
            >
              {tr.joinExisting}
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>{tr.yourName}</Label>
            <Input placeholder={tr.namePlaceholder} value={userName} onChange={(e) => setUserName(e.target.value)} />
          </div>
          {mode === 'create' ? (
            <div className="space-y-1">
              <Label>{tr.orgName}</Label>
              <Input
                placeholder={tr.orgPlaceholder}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          ) : (
            <div className="space-y-1">
              <Label>{tr.joinCode}</Label>
              <Input
                placeholder={tr.joinCodePlaceholder}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="font-mono tracking-widest uppercase"
              />
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3 font-mono break-all">
              {error}
            </div>
          )}
          <Button className="w-full" onClick={handleSubmit} disabled={isDisabled}>
            {loading
              ? mode === 'create' ? tr.creating : tr.joining
              : mode === 'create' ? tr.createOrg : tr.joinOrg}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
