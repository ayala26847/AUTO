import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, Plus, Trash2 } from 'lucide-react'
import {
  fetchProjects, fetchTimeLogs, insertTimeLog, deleteTimeLog,
  fetchOrgMembers, fetchTasks, fetchProjectSubTasks,
} from '@/lib/queries'
import { useAuthStore } from '@/stores/authStore'
import { useLang } from '@/hooks/useLang'
import { useTimer } from '@/hooks/useTimer'
import { MemberPicker } from '@/components/ui/member-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatHours, formatCurrency } from '@/lib/utils'
import type { User } from '@/types'

function AttributedChips({ attributedTo, members }: { attributedTo: string[]; members: User[] }) {
  if (attributedTo.length === 0) return null
  if (attributedTo.length === 1) {
    const m = members.find((m) => m.id === attributedTo[0])
    return m ? <span className="text-xs text-muted-foreground">{m.name}</span> : null
  }
  return (
    <div className="flex gap-1 flex-wrap mt-0.5">
      {attributedTo.map((id) => {
        const m = members.find((m) => m.id === id)
        if (!m) return null
        return (
          <span
            key={id}
            title={m.name}
            className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center"
          >
            {m.name.slice(0, 2).toUpperCase()}
          </span>
        )
      })}
    </div>
  )
}

export default function TimeTrackerPage() {
  const { organization, user } = useAuthStore()
  const { tr } = useLang()
  const orgId = organization?.id ?? ''
  const qc = useQueryClient()
  const {
    activeTimer, elapsedSeconds, isRunning, handleStart, handleStop, isStarting, isStopping,
  } = useTimer()

  const [selectedProject, setSelectedProject] = useState('')
  const [selectedTask, setSelectedTask] = useState('')
  const [selectedSubTask, setSelectedSubTask] = useState('')
  const [stopAttributedTo, setStopAttributedTo] = useState<string[]>(() => user ? [user.id] : [])

  const [manualHours, setManualHours] = useState('')
  const [manualDesc, setManualDesc] = useState('')
  const [manualProject, setManualProject] = useState('')
  const [manualTask, setManualTask] = useState('')
  const [manualSubTask, setManualSubTask] = useState('')
  const [manualAttributedTo, setManualAttributedTo] = useState<string[]>(() => user ? [user.id] : [])

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
  const { data: timeLogs = [] } = useQuery({
    queryKey: ['time-logs', orgId],
    queryFn: () => fetchTimeLogs(orgId),
    enabled: !!orgId,
  })

  const { data: liveProjectTasks = [] } = useQuery({
    queryKey: ['tasks', selectedProject],
    queryFn: () => fetchTasks(selectedProject),
    enabled: !!selectedProject,
  })
  const { data: liveProjectSubTasks = [] } = useQuery({
    queryKey: ['sub-tasks', selectedProject],
    queryFn: () => fetchProjectSubTasks(selectedProject),
    enabled: !!selectedProject && !!selectedTask,
  })
  const liveSubTasksForTask = liveProjectSubTasks.filter((s) => s.task_id === selectedTask)

  const { data: manualProjectTasks = [] } = useQuery({
    queryKey: ['tasks', manualProject],
    queryFn: () => fetchTasks(manualProject),
    enabled: !!manualProject,
  })
  const { data: manualProjectSubTasks = [] } = useQuery({
    queryKey: ['sub-tasks', manualProject],
    queryFn: () => fetchProjectSubTasks(manualProject),
    enabled: !!manualProject && !!manualTask,
  })
  const manualSubTasksForTask = manualProjectSubTasks.filter((s) => s.task_id === manualTask)

  const manualLogMutation = useMutation({
    mutationFn: insertTimeLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-logs'] })
      qc.invalidateQueries({ queryKey: ['project-time-logs', manualProject] })
      setManualHours('')
      setManualDesc('')
      setManualProject('')
      setManualTask('')
      setManualSubTask('')
      setManualAttributedTo(user ? [user.id] : [])
    },
  })

  const deleteLogMutation = useMutation({
    mutationFn: deleteTimeLog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-logs'] }),
  })

  const h = Math.floor(elapsedSeconds / 3600)
  const m = Math.floor((elapsedSeconds % 3600) / 60)
  const s = elapsedSeconds % 60
  const display = [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')

  function handleManualLog() {
    if (!manualProject || !manualHours || !user || !organization || manualAttributedTo.length === 0) return
    manualLogMutation.mutate({
      org_id: organization.id,
      project_id: manualProject,
      user_id: user.id,
      task_id: manualTask || null,
      sub_task_id: manualSubTask || null,
      hours: parseFloat(manualHours),
      description: manualDesc,
      attributed_to: manualAttributedTo,
    })
  }

  const tt = tr.timeTracker
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{tt.title}</h1>
        <p className="text-muted-foreground text-sm">{tt.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Live Timer ── */}
        <Card>
          <CardHeader><CardTitle className="text-base">{tt.liveTimer}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {isRunning ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-mono font-bold text-primary">{display}</div>
                  {activeTimer?.project && (
                    <p className="text-sm text-muted-foreground font-medium mt-1">
                      {activeTimer.project.name}
                      {activeTimer.task && ` → ${activeTimer.task.title}`}
                      {activeTimer.sub_task && ` → ${activeTimer.sub_task.title}`}
                    </p>
                  )}
                  <p className="text-xs text-amber-600 mt-1">{tt.autoStop}</p>
                </div>
                <MemberPicker
                  members={members}
                  selected={stopAttributedTo}
                  onChange={setStopAttributedTo}
                  label={tt.whoWorked}
                  selectAllLabel={tt.selectAll}
                />
                <Button
                  variant="destructive"
                  className="w-full"
                  size="lg"
                  onClick={() => handleStop(stopAttributedTo)}
                  disabled={isStopping || stopAttributedTo.length === 0}
                >
                  <Square className="h-4 w-4 me-2" />
                  {isStopping ? tt.stopping : tt.stopSave}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>{tt.project}</Label>
                  <Select
                    value={selectedProject}
                    onValueChange={(v) => { setSelectedProject(v); setSelectedTask(''); setSelectedSubTask('') }}
                  >
                    <SelectTrigger><SelectValue placeholder={tt.selectProject} /></SelectTrigger>
                    <SelectContent>
                      {projects.filter((p) => p.status === 'Active').map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProject && liveProjectTasks.length > 0 && (
                  <div className="space-y-1">
                    <Label>משימה <span className="text-muted-foreground">(אופציונלי)</span></Label>
                    <Select
                      value={selectedTask}
                      onValueChange={(v) => { setSelectedTask(v); setSelectedSubTask('') }}
                    >
                      <SelectTrigger><SelectValue placeholder="כללי (ללא משימה)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">כללי (ללא משימה)</SelectItem>
                        {liveProjectTasks.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedTask && liveSubTasksForTask.length > 0 && (
                  <div className="space-y-1">
                    <Label>תת-משימה <span className="text-muted-foreground">(אופציונלי)</span></Label>
                    <Select value={selectedSubTask} onValueChange={setSelectedSubTask}>
                      <SelectTrigger><SelectValue placeholder="ללא תת-משימה" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">ללא תת-משימה</SelectItem>
                        {liveSubTasksForTask.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleStart(
                    selectedProject,
                    selectedTask || null,
                    selectedSubTask || null,
                  )}
                  disabled={!selectedProject || isStarting}
                >
                  <Play className="h-4 w-4 me-2" />
                  {isStarting ? tt.starting : tt.startTimer}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Manual Log ── */}
        <Card>
          <CardHeader><CardTitle className="text-base">{tt.manualLog}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>{tt.project}</Label>
              <Select
                value={manualProject}
                onValueChange={(v) => { setManualProject(v); setManualTask(''); setManualSubTask('') }}
              >
                <SelectTrigger><SelectValue placeholder={tt.selectProject} /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {manualProject && manualProjectTasks.length > 0 && (
              <div className="space-y-1">
                <Label>משימה <span className="text-muted-foreground">(אופציונלי)</span></Label>
                <Select
                  value={manualTask}
                  onValueChange={(v) => { setManualTask(v); setManualSubTask('') }}
                >
                  <SelectTrigger><SelectValue placeholder="כללי (ללא משימה)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">כללי (ללא משימה)</SelectItem>
                    {manualProjectTasks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {manualTask && manualSubTasksForTask.length > 0 && (
              <div className="space-y-1">
                <Label>תת-משימה <span className="text-muted-foreground">(אופציונלי)</span></Label>
                <Select value={manualSubTask} onValueChange={setManualSubTask}>
                  <SelectTrigger><SelectValue placeholder="ללא תת-משימה" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ללא תת-משימה</SelectItem>
                    {manualSubTasksForTask.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label>{tt.hours}</Label>
              <Input
                type="number"
                step="0.25"
                min="0"
                placeholder={tt.hoursPlaceholder}
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{tr.common.description}</Label>
              <Textarea
                placeholder={tt.whatWorked}
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                rows={2}
              />
            </div>
            <MemberPicker
              members={members}
              selected={manualAttributedTo}
              onChange={setManualAttributedTo}
              label={tt.whoWorked}
              selectAllLabel={tt.selectAll}
            />
            <Button
              className="w-full"
              onClick={handleManualLog}
              disabled={!manualProject || !manualHours || manualAttributedTo.length === 0 || manualLogMutation.isPending}
            >
              <Plus className="h-4 w-4 me-2" />
              {manualLogMutation.isPending ? tt.savingLog : tt.logTime}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Logs ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {tt.recentLogs}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              ({formatHours(timeLogs.slice(0, 50).reduce((h, t) => h + t.hours, 0))} {tr.common.total})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tt.noLogs}</p>
          ) : (
            <div className="divide-y text-sm">
              {timeLogs.slice(0, 50).map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{log.project?.name ?? tt.unknownProject}</p>
                    <p className="text-xs text-muted-foreground">{log.user?.name}</p>
                    {log.description && (
                      <p className="text-xs text-muted-foreground truncate">{log.description}</p>
                    )}
                    <AttributedChips attributedTo={log.attributed_to ?? []} members={members} />
                  </div>
                  <div className="text-end shrink-0">
                    <p className="font-mono font-semibold">{formatHours(log.hours)}</p>
                    {log.project?.pricing_type === 'Hourly' && log.project?.budget && (
                      <p className="text-xs text-green-600">
                        {formatCurrency(log.hours * log.project.budget)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive shrink-0"
                    onClick={() => deleteLogMutation.mutate(log.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
