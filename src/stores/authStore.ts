import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Organization } from '@/types'

interface AuthState {
  user: User | null
  organization: Organization | null
  supabaseUserId: string | null
  setUser: (user: User | null) => void
  setOrganization: (org: Organization | null) => void
  setSupabaseUserId: (id: string | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organization: null,
      supabaseUserId: null,
      setUser: (user) => set({ user }),
      setOrganization: (organization) => set({ organization }),
      setSupabaseUserId: (supabaseUserId) => set({ supabaseUserId }),
      clear: () => set({ user: null, organization: null, supabaseUserId: null }),
    }),
    { name: 'autocrm-auth' },
  ),
)
