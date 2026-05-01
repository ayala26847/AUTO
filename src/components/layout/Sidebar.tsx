import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, Briefcase, FolderKanban,
  Clock, BarChart3, LogOut, Building2, Copy, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { useLang } from '@/hooks/useLang'
import { LangToggle } from '@/components/ui/lang-toggle'
import { fetchOrganization } from '@/lib/queries'

export default function Sidebar() {
  const { signOut } = useAuth()
  const { user, organization } = useAuthStore()
  const { tr } = useLang()
  const [copied, setCopied] = useState(false)

  const { data: orgData } = useQuery({
    queryKey: ['organization', organization?.id],
    queryFn: () => fetchOrganization(organization!.id),
    enabled: !!organization?.id,
  })

  const joinCode = orgData?.join_code ?? organization?.join_code

  function handleCopy() {
    if (!joinCode) return
    navigator.clipboard.writeText(joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: tr.nav.dashboard },
    { to: '/clients', icon: Users, label: tr.nav.clients },
    { to: '/leads', icon: Briefcase, label: tr.nav.leads },
    { to: '/projects', icon: FolderKanban, label: tr.nav.projects },
    { to: '/time', icon: Clock, label: tr.nav.timeTracker },
    { to: '/reports', icon: BarChart3, label: tr.nav.reports },
  ]

  return (
    <aside className="w-60 min-h-screen bg-slate-900 text-slate-100 flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{organization?.name ?? 'AutoCRM'}</p>
            <p className="text-xs text-slate-400 truncate">
              {user?.role ? tr.nav.role[user.role] : ''}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 py-4 border-t border-slate-700 space-y-2">
        <div className="px-3 pb-1">
          <LangToggle />
        </div>

        {joinCode && (
          <div className="px-3 pb-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 w-full text-xs text-slate-400 hover:text-slate-200 transition-colors group"
              title={copied ? tr.sidebar.copied : tr.sidebar.orgCode}
            >
              <span className="font-mono bg-slate-800 px-2 py-1 rounded tracking-widest text-slate-300 group-hover:text-white transition-colors">
                {joinCode}
              </span>
              {copied
                ? <Check className="h-3 w-3 text-green-400 shrink-0" />
                : <Copy className="h-3 w-3 shrink-0" />}
              <span className="truncate">{copied ? tr.sidebar.copied : tr.sidebar.orgCode}</span>
            </button>
          </div>
        )}

        <div className="px-3 py-1">
          <p className="text-xs text-slate-400 truncate">{user?.name}</p>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {tr.nav.signOut}
        </button>
      </div>
    </aside>
  )
}
