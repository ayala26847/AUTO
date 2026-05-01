import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const { user, organization, supabaseUserId, setUser, setOrganization, setSupabaseUserId, clear } =
    useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUserId(session.user.id)
        loadProfile(session.user.id)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSupabaseUserId(session.user.id)
        loadProfile(session.user.id)
      } else {
        clear()
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadProfile(supaId: string) {
    const { data: profile } = await supabase
      .from('users')
      .select('*, organization:organizations(*)')
      .eq('id', supaId)
      .maybeSingle()

    if (profile) {
      const { organization: org, ...userData } = profile
      setUser(userData)
      setOrganization(org)
    }
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signInWithMagicLink(email: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    clear()
  }

  return { user, organization, supabaseUserId, signInWithGoogle, signInWithMagicLink, signOut, isAuthenticated: !!user }
}
