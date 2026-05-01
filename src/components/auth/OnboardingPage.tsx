import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { Organization, User } from '@/types'

export default function OnboardingPage() {
  const { setUser, setOrganization } = useAuthStore()
  const [orgName, setOrgName] = useState('')
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!orgName.trim() || !userName.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data, error: rpcError } = await supabase.rpc('setup_workspace', {
        p_org_name: orgName.trim(),
        p_user_name: userName.trim(),
      })

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setup your workspace</CardTitle>
          <CardDescription>Create your organization to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Your name</Label>
            <Input
              placeholder="John Doe"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Organization name</Label>
            <Input
              placeholder="My Automation Agency"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3 font-mono break-all">
              {error}
            </div>
          )}
          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={loading || !orgName.trim() || !userName.trim()}
          >
            {loading ? 'Creating...' : 'Create Organization'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
