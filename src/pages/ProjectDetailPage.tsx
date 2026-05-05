import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, GripVertical, Trash2, Play } from 'lucide-react'
import {
  fetchProject, fetchTasks, upsertTask, deleteTask,
  fetchProjectTimeLogs, fetchProjectExpenses, insertExpense, deleteExpense,
  fetchOrgMembers,
} from '@/lib/queries'
import { useAuthStore } from '@/stores/authStore'
import { useLang } from '@/hooks/useLang'
import { useTimer } from '@/hooks/useTimer'
import type { Task, TimeLog, User } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatHours, calcEHR, getMemberAttributedHours } from '@/lib/utils'
import { ProjectLinksTab } from '@/components/project/ProjectLinksTab'

const KANBAN_COLS: Task['status'][] = ['Backlog', 'In Progress', 'Review', 'Done']

function AttributedChips({ attributedTo, members }: { attributedTo: string[]; members: User[] }) {
  if (!attributedTo || attributedTo.length <= 1) return null
  return (
    <div className="flex gap-1 flex-wrap mt-0.5">
      {attributedTo.map((id) => {
        const m = members.find((m) => m.id === id)
        if (!m) return null
        return (
          <span key={id} title={m.name} className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
            {m.name.slice(0, 2).toUpperCase()}
          </span>
        )
      })}
    </div>
  )
}

function TaskDialog({
  open, onClose, projectId, orgId,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  orgId: string
}) {
  const qc = useQueryClient()
  const { tr } = useLang()
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<Task['status']>('Backlog')
  const [assignedTo, setAssignedTo] = useState('none')
  const [dueDate, setDueDate] = useState('')

  const { data: members = [] } = useQuery({
    queryKey: ['members', orgId],
    queryFn: () => fetchOrgMembers(orgId),
    enabled: !!orgId,
  })

  const mutation = useMutation({
    mutationFn: upsertTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] })
      onClose()
    },
  })

  function handleSave() {
    mutation.mutate({
      project_id: projectId,
      org_id: orgId,
      title,
      status,
      assigned_to: assignedTo === 'none' || assignedTo === '' ? null : assignedTo,
      due_date: dueDate || null,
    })
  }

  const pd = tr.projectDetail
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{pd.newTask}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>{pd.taskTitle}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{tr.common.status}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Task['status'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KANBAN_COLS.map((s) => <SelectItem key={s} value={s}>{pd.taskStatuses[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{pd.assignedTo}</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger><SelectValue placeholder={pd.unassigned} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{pd.unassigned}</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{pd.dueDate}</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tr.common.cancel}</Button>
          <Button onClick={handleSave} disabled={!title.trim() || mutation.isPending}>
            {mutation.isPending ? pd.addingTask : pd.addTaskBtn}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { organization } = useAuthStore()
  const { tr } = useLang()
  const orgId = organization?.id ?? ''
  const qc = useQueryClient()
  const { handleStart, isRunning } = useTimer()
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDesc, setExpenseDesc] = useState('')

  const { data: project } = useQuery({ queryKey: ['project', id], queryFn: () => fetchProject(id!), enabled: !!id })
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks', id], queryFn: () => fetchTasks(id!), enabled: !!id })
  const { data: timeLogs = [] } = useQuery({ queryKey: ['project-time-logs', id], queryFn: () => fetchProjectTimeLogs(id!), enabled: !!id })
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses', id], queryFn: () => fetchProjectExpenses(id!), enabled: !!id })
  const { data: members = [] } = useQuery({ queryKey: ['members', orgId], queryFn: () => fetchOrgMembers(orgId), enabled: !!orgId })

  const deleteTaskMutation = useMutation({ mutationFn: deleteTask, onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', id] }) })
  const addExpenseMutation = useMutation({
    mutationFn: insertExpense,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses', id] }); setExpenseAmount(''); setExpenseDesc('') },
  })
  const deleteExpenseMutation = useMutation({ mutationFn: deleteExpense, onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses', id] }) })
  const updateTaskStatus = useMutation({
    mutationFn: (payload: { task: Task; status: Task['status'] }) => upsertTask({ ...payload.task, status: payload.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', id] }),
  })

  const pd = tr.projectDetail
  const p = tr.projects

  if (!project) return <div className="p-6 text-muted-foreground">{tr.common.loading}</div>

  const totalHours = timeLogs.reduce((h, t) => h + t.hours, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netProfit = project.pricing_type === 'Fixed' ? project.budget - totalExpenses : 0
  const ehr = calcEHR(netProfit, totalHours)

  // Unique members attributed across all logs for this project
  const uniqueAttributedIds = new Set(timeLogs.flatMap((log) => log.attributed_to ?? []))
  const perMemberFixedPayout = uniqueAttributedIds.size > 0 ? netProfit / uniqueAttributedIds.size : 0

  const partnerBreakdown = members
    .map((m) => {
      const hours = getMemberAttributedHours(m.id, timeLogs)
      const inPool = uniqueAttributedIds.has(m.id)
      if (!inPool && hours === 0) return null
      const payout = project.pricing_type === 'Fixed'
        ? (inPool ? perMemberFixedPayout : 0)
        : hours * project.budget
      return { member: m, hours, payout }
    })
    .filter((x): x is { member: User; hours: number; payout: number } => x !== null && (x.payout > 0 || x.hours > 0))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground text-sm">{project.client?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{p.pricing[project.pricing_type]}</Badge>
          <Badge>{p.statuses[project.status]}</Badge>
          <Button size="sm" onClick={() => handleStart(project.id, null)} disabled={isRunning}>
            <Play className="h-3 w-3 me-1" />
            {isRunning ? pd.timerRunning : pd.startTimer}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{pd.budget}</CardTitle></CardHeader><CardContent><p className="text-lg font-bold">{formatCurrency(project.budget)}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{pd.totalHours}</CardTitle></CardHeader><CardContent><p className="text-lg font-bold">{formatHours(totalHours)}</p></CardContent></Card>
        {project.pricing_type === 'Fixed' && (
          <>
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{pd.netProfit}</CardTitle></CardHeader><CardContent><p className="text-lg font-bold text-green-600">{formatCurrency(netProfit)}</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{pd.ehr}</CardTitle></CardHeader><CardContent><p className="text-lg font-bold">{formatCurrency(ehr)}/hr</p></CardContent></Card>
          </>
        )}
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">{pd.kanban}</TabsTrigger>
          <TabsTrigger value="time">{pd.timeLogs}</TabsTrigger>
          <TabsTrigger value="financials">{pd.financials}</TabsTrigger>
          <TabsTrigger value="links">{pd.links}</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{tasks.length} {pd.tasks}</p>
            <Button size="sm" onClick={() => setTaskDialogOpen(true)}>
              <Plus className="h-3 w-3 me-1" /> {pd.addTask}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {KANBAN_COLS.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col)
              return (
                <div key={col} className="space-y-2">
                  <div className="flex items-center gap-2 pb-1 border-b">
                    <span className="text-sm font-medium">{pd.taskStatuses[col]}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[80px]">
                    {colTasks.map((task) => (
                      <Card key={task.id} className="group">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-tight">{task.title}</p>
                              {task.assignee && <p className="text-xs text-muted-foreground mt-1">{task.assignee.name}</p>}
                              {task.due_date && <p className="text-xs text-muted-foreground">{task.due_date}</p>}
                            </div>
                            <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteTaskMutation.mutate(task.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <Select value={task.status} onValueChange={(v) => updateTaskStatus.mutate({ task, status: v as Task['status'] })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{KANBAN_COLS.map((s) => <SelectItem key={s} value={s}>{pd.taskStatuses[s]}</SelectItem>)}</SelectContent>
                          </Select>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="time" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">{pd.timeLogs}</CardTitle></CardHeader>
            <CardContent>
              {timeLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{pd.noTimeLogs}</p>
              ) : (
                <div className="divide-y text-sm">
                  {timeLogs.map((log: TimeLog) => (
                    <div key={log.id} className="py-2 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{log.user?.name ?? pd.unknown}</p>
                        {log.description && <p className="text-xs text-muted-foreground">{log.description}</p>}
                        <AttributedChips attributedTo={log.attributed_to ?? []} members={members} />
                      </div>
                      <div className="text-end">
                        <p className="font-mono font-semibold">{formatHours(log.hours)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{pd.expenses}</CardTitle>
                <span className="text-sm font-bold">{formatCurrency(totalExpenses)}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder={pd.amountPlaceholder} type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-32" />
                <Input placeholder={pd.descPlaceholder} value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} className="flex-1" />
                <Button size="sm" disabled={!expenseAmount || !expenseDesc || addExpenseMutation.isPending}
                  onClick={() => addExpenseMutation.mutate({ org_id: orgId, project_id: project.id, amount: parseFloat(expenseAmount), description: expenseDesc })}>
                  {tr.common.add}
                </Button>
              </div>
              {expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between text-sm">
                  <span>{exp.description}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatCurrency(exp.amount)}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteExpenseMutation.mutate(exp.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {partnerBreakdown.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">{pd.partnerPayouts}</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y text-sm">
                  {partnerBreakdown.map(({ member, hours, payout }) => (
                    <div key={member.id} className="py-2 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{formatHours(hours)} {tr.reports.logged}</p>
                      </div>
                      <div className="text-end">
                        <p className="font-bold text-green-600">{formatCurrency(payout)}</p>
                        {project.pricing_type === 'Fixed' && (
                          <p className="text-xs text-muted-foreground">({pd.equalSplit})</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="links" className="mt-4">
          <ProjectLinksTab projectId={id!} orgId={orgId} />
        </TabsContent>
      </Tabs>

      <TaskDialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} projectId={id!} orgId={orgId} />
    </div>
  )
}
