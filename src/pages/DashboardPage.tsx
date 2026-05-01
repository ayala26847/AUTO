import { useQuery } from '@tanstack/react-query'
import { TrendingUp, DollarSign, Clock, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { fetchProjects, fetchTimeLogs, fetchOrgMembers } from '@/lib/queries'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, formatHours, calcEHR } from '@/lib/utils'

export default function DashboardPage() {
  const { organization } = useAuthStore()
  const orgId = organization?.id ?? ''

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', orgId],
    queryFn: () => fetchProjects(orgId),
    enabled: !!orgId,
  })

  const { data: timeLogs = [] } = useQuery({
    queryKey: ['time-logs', orgId],
    queryFn: () => fetchTimeLogs(orgId),
    enabled: !!orgId,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members', orgId],
    queryFn: () => fetchOrgMembers(orgId),
    enabled: !!orgId,
  })

  const activeProjects = projects.filter((p) => p.status === 'Active')

  const totalOutstandingRevenue = activeProjects.reduce((sum, p) => {
    if (p.pricing_type === 'Fixed') return sum + p.budget
    const hours = timeLogs.filter((t) => t.project_id === p.id).reduce((h, t) => h + t.hours, 0)
    return sum + hours * p.budget
  }, 0)

  const totalHoursThisWeek = timeLogs
    .filter((t) => {
      const d = new Date(t.created_at)
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      return d >= weekStart
    })
    .reduce((h, t) => h + t.hours, 0)

  const ehrByProject = activeProjects
    .filter((p) => p.pricing_type === 'Fixed')
    .map((p) => {
      const projectLogs = timeLogs.filter((t) => t.project_id === p.id)
      const totalHours = projectLogs.reduce((h, t) => h + t.hours, 0)
      const ehr = calcEHR(p.budget, totalHours)
      return { project: p, ehr, totalHours }
    })
    .sort((a, b) => b.ehr - a.ehr)
    .slice(0, 5)

  const memberCapacity = members.map((m) => {
    const weekHours = timeLogs
      .filter((t) => {
        const d = new Date(t.created_at)
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        return t.user_id === m.id && d >= weekStart
      })
      .reduce((h, t) => h + t.hours, 0)
    return { member: m, hours: weekHours }
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Business overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOutstandingRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{activeProjects.length} active projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hours This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(totalHoursThisWeek)}</div>
            <p className="text-xs text-muted-foreground mt-1">across all projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{projects.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground mt-1">in organization</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Efficiency Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Efficiency Matrix (EHR)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ehrByProject.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fixed-price projects with logged hours.</p>
            ) : (
              ehrByProject.map(({ project, ehr, totalHours }) => {
                const maxEhr = ehrByProject[0].ehr || 1
                return (
                  <div key={project.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate max-w-[200px]">{project.name}</span>
                      <span className="text-muted-foreground">{formatCurrency(ehr)}/hr · {formatHours(totalHours)}</span>
                    </div>
                    <Progress value={(ehr / maxEhr) * 100} className="h-2" />
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Team Capacity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team Capacity — This Week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {memberCapacity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team members found.</p>
            ) : (
              memberCapacity.map(({ member, hours }) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <Badge variant={member.role === 'Admin' ? 'default' : 'secondary'} className="text-xs">
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground">{formatHours(hours)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {activeProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active projects. Create one to get started.</p>
          ) : (
            <div className="divide-y">
              {activeProjects.map((project) => {
                const hours = timeLogs.filter((t) => t.project_id === project.id).reduce((h, t) => h + t.hours, 0)
                return (
                  <div key={project.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.client?.name}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={project.pricing_type === 'Fixed' ? 'default' : 'secondary'}>
                        {project.pricing_type}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{formatHours(hours)} logged</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
