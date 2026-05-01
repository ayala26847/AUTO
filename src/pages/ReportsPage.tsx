import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchProjects, fetchProjectTimeLogs, fetchProjectExpenses, fetchOrgMembers } from '@/lib/queries'
import { useAuthStore } from '@/stores/authStore'
import { useLang } from '@/hooks/useLang'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, formatHours, calcEHR, calcPartnerPayout, resolveAttributedHours } from '@/lib/utils'
import type { Project, TimeLog, Expense } from '@/types'
import type { User } from '@/types'

interface ProjectReport {
  project: Project
  timeLogs: TimeLog[]
  totalHours: number
  totalExpenses: number
  netProfit: number
  ehr: number
}

interface MemberPayout {
  member: User
  totalPayout: number
  totalHours: number
}

export default function ReportsPage() {
  const { organization } = useAuthStore()
  const { tr } = useLang()
  const orgId = organization?.id ?? ''
  const [reports, setReports] = useState<ProjectReport[]>([])
  const [memberPayouts, setMemberPayouts] = useState<MemberPayout[]>([])

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', orgId],
    queryFn: () => fetchProjects(orgId),
    enabled: !!orgId,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members', orgId],
    queryFn: () => fetchOrgMembers(orgId),
    enabled: !!orgId,
  })

  useEffect(() => {
    if (projects.length === 0) return
    Promise.all(
      projects.map(async (p) => {
        const [logs, expenses]: [TimeLog[], Expense[]] = await Promise.all([
          fetchProjectTimeLogs(p.id),
          fetchProjectExpenses(p.id),
        ])
        const totalHours = logs.reduce((h, t) => h + t.hours, 0)
        const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
        const netProfit = p.pricing_type === 'Fixed' ? p.budget - totalExpenses : 0
        const ehr = calcEHR(netProfit, totalHours)
        return { project: p, timeLogs: logs, totalHours, totalExpenses, netProfit, ehr }
      }),
    ).then((rpts) => {
      setReports(rpts)

      if (members.length > 0) {
        const payouts = members.map((m) => {
          let totalPayout = 0
          let totalHours = 0
          for (const r of rpts) {
            const mHours = r.timeLogs.reduce((sum, log) => {
              const resolved = resolveAttributedHours(log, members)
              const entry = resolved.find((e) => e.userId === m.id)
              return sum + (entry?.hours ?? 0)
            }, 0)
            if (mHours === 0) continue
            totalHours += mHours
            const payout =
              r.project.pricing_type === 'Fixed'
                ? calcPartnerPayout(mHours, r.totalHours, r.netProfit)
                : mHours * r.project.budget
            totalPayout += payout
          }
          return { member: m, totalPayout, totalHours }
        }).filter((p) => p.totalHours > 0)
        setMemberPayouts(payouts)
      }
    })
  }, [projects, members])

  const topEhr = Math.max(...reports.map((r) => r.ehr), 1)

  const totalRevenue = reports.reduce((sum, r) => {
    if (r.project.pricing_type === 'Fixed') return sum + r.project.budget
    return sum + r.totalHours * r.project.budget
  }, 0)

  const totalProfit = reports
    .filter((r) => r.project.pricing_type === 'Fixed')
    .reduce((sum, r) => sum + r.netProfit, 0)

  const rp = tr.reports
  const pp = tr.projects
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{rp.title}</h1>
        <p className="text-muted-foreground text-sm">{rp.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">{rp.totalRevenue}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">{rp.fixedProfit}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalProfit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">{rp.teamMembers}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{members.length}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{rp.projectProfitability}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">{rp.noData}</p>
          ) : (
            reports.map((r) => (
              <div key={r.project.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.project.name}</span>
                    <Badge variant="outline">{pp.pricing[r.project.pricing_type]}</Badge>
                    <Badge>{pp.statuses[r.project.status]}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatHours(r.totalHours)}</span>
                    {r.project.pricing_type === 'Fixed' && (
                      <>
                        <span className="text-green-600 font-semibold">{formatCurrency(r.netProfit)} {rp.profit}</span>
                        <span className="font-semibold">{formatCurrency(r.ehr)}/hr EHR</span>
                      </>
                    )}
                    {r.project.pricing_type === 'Hourly' && (
                      <span className="font-semibold">
                        {formatCurrency(r.totalHours * r.project.budget)} {rp.billed}
                      </span>
                    )}
                  </div>
                </div>
                {r.project.pricing_type === 'Fixed' && r.ehr > 0 && (
                  <Progress value={Math.min((r.ehr / topEhr) * 100, 100)} className="h-1.5" />
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{rp.partnerPayouts}</CardTitle></CardHeader>
        <CardContent>
          {memberPayouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{rp.noPayouts}</p>
          ) : (
            <div className="space-y-3">
              {memberPayouts.map(({ member, totalPayout, totalHours }) => (
                <div key={member.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">{tr.nav.role[member.role]}</Badge>
                        <span className="ms-2">{formatHours(totalHours)} {rp.logged}</span>
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(totalPayout)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
