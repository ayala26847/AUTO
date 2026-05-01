import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, Plus, Trash2 } from 'lucide-react'
import { fetchProjects, fetchTimeLogs, insertTimeLog, deleteTimeLog } from '@/lib/queries'
import { useAuthStore } from '@/stores/authStore'
import { useTimer } from '@/hooks/useTimer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatHours, formatCurrency } from '@/lib/utils'

export default function TimeTrackerPage() {
  const { organization, user } = useAuthStore()
  const orgId = organization?.id ?? ''
  const qc = useQueryClient()
  const { activeTimer, elapsedSeconds, isRunning, handleStart, handleStop, isStarting, isStopping } = useTimer()

  const [selectedProject, setSelectedProject] = useState('')
  const [manualHours, setManualHours] = useState('')
  const [manualDesc, setManualDesc] = useState('')
  const [manualProject, setManualProject] = useState('')

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

  const manualLogMutation = useMutation({
    mutationFn: insertTimeLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-logs'] })
      setManualHours('')
      setManualDesc('')
      setManualProject('')
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
    if (!manualProject || !manualHours || !user || !organization) return
    manualLogMutation.mutate({
      org_id: organization.id,
      project_id: manualProject,
      user_id: user.id,
      task_id: null,
      hours: parseFloat(manualHours),
      description: manualDesc,
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Time Tracker</h1>
        <p className="text-muted-foreground text-sm">Track time live or log manually</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Timer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Timer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isRunning ? (
              <div className="text-center space-y-4">
                <div className="text-5xl font-mono font-bold text-primary">{display}</div>
                {activeTimer?.project && (
                  <p className="text-sm text-muted-foreground font-medium">{activeTimer.project.name}</p>
                )}
                <p className="text-xs text-amber-600">
                  Auto-stops after 8 hours of continuous tracking
                </p>
                <Button
                  variant="destructive" className="w-full" size="lg"
                  onClick={handleStop} disabled={isStopping}
                >
                  <Square className="h-4 w-4 mr-2" />
                  {isStopping ? 'Stopping...' : 'Stop & Save'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Project</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                    <SelectContent>
                      {projects.filter((p) => p.status === 'Active').map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full" size="lg"
                  onClick={() => handleStart(selectedProject, null)}
                  disabled={!selectedProject || isStarting}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isStarting ? 'Starting...' : 'Start Timer'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Project</Label>
              <Select value={manualProject} onValueChange={setManualProject}>
                <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Hours</Label>
              <Input
                type="number" step="0.25" min="0" placeholder="e.g. 2.5"
                value={manualHours} onChange={(e) => setManualHours(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                placeholder="What did you work on?"
                value={manualDesc} onChange={(e) => setManualDesc(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleManualLog}
              disabled={!manualProject || !manualHours || manualLogMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              {manualLogMutation.isPending ? 'Saving...' : 'Log Time'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Recent Time Logs
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({formatHours(timeLogs.slice(0, 50).reduce((h, t) => h + t.hours, 0))} total)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No time logged yet.</p>
          ) : (
            <div className="divide-y text-sm">
              {timeLogs.slice(0, 50).map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{log.project?.name ?? 'Unknown project'}</p>
                    <p className="text-xs text-muted-foreground">{log.user?.name}</p>
                    {log.description && (
                      <p className="text-xs text-muted-foreground truncate">{log.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
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
                    size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0"
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
