import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FolderOpen, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  fetchProjects, upsertProject, deleteProject, fetchClients, fetchProjectsProgressSummary,
} from '@/lib/queries'
import { useAuthStore } from '@/stores/authStore'
import { useLang } from '@/hooks/useLang'
import type { Project } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatHours, cn } from '@/lib/utils'

const STATUS_OPTIONS: Project['status'][] = [
  'Not Started', 'Active', 'In Review', 'Stuck', 'On Hold', 'Completed', 'Cancelled',
]
const PRICING_OPTIONS: Project['pricing_type'][] = ['Hourly', 'Fixed']

const STATUS_COLOR: Record<Project['status'], 'default' | 'success' | 'warning' | 'secondary' | 'destructive'> = {
  'Not Started': 'secondary',
  Active: 'success',
  'In Review': 'warning',
  Stuck: 'destructive',
  'On Hold': 'secondary',
  Completed: 'default',
  Cancelled: 'destructive',
}

function MiniProgress({ pct, label }: { pct: number; label: string }) {
  const isOver = pct > 100
  const displayPct = Math.min(pct, 100)
  return (
    <div className="space-y-0.5 mt-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={cn('font-medium tabular-nums', isOver && 'text-red-600')}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isOver ? 'bg-red-500' : pct >= 100 ? 'bg-green-500' : 'bg-primary',
          )}
          style={{ width: `${displayPct}%` }}
        />
      </div>
    </div>
  )
}

function ProjectDialog({
  open, onClose, orgId, initial,
}: {
  open: boolean
  onClose: () => void
  orgId: string
  initial?: Project
}) {
  const qc = useQueryClient()
  const { tr } = useLang()
  const [name, setName] = useState(initial?.name ?? '')
  const [clientId, setClientId] = useState(initial?.client_id ?? '')
  const [status, setStatus] = useState<Project['status']>(initial?.status ?? 'Active')
  const [pricingType, setPricingType] = useState<Project['pricing_type']>(initial?.pricing_type ?? 'Fixed')
  const [budget, setBudget] = useState(initial?.budget?.toString() ?? '')
  const [estimatedHours, setEstimatedHours] = useState(
    initial?.estimated_hours ? initial.estimated_hours.toString() : '',
  )

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setClientId(initial?.client_id ?? '')
    setStatus(initial?.status ?? 'Active')
    setPricingType(initial?.pricing_type ?? 'Fixed')
    setBudget(initial?.budget?.toString() ?? '')
    setEstimatedHours(initial?.estimated_hours ? initial.estimated_hours.toString() : '')
  }, [open, initial?.id])

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', orgId],
    queryFn: () => fetchClients(orgId),
    enabled: !!orgId,
  })

  const mutation = useMutation({
    mutationFn: upsertProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projects-progress'] })
      onClose()
    },
  })

  function handleSave() {
    mutation.mutate({
      ...(initial?.id ? { id: initial.id } : {}),
      org_id: orgId,
      name,
      client_id: clientId || null,
      status,
      pricing_type: pricingType,
      budget: parseFloat(budget) || 0,
      estimated_hours: parseFloat(estimatedHours) || 0,
    })
  }

  const p = tr.projects
  const isEdit = !!initial
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? p.editProject : p.newProject}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>{p.projectName}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={p.projectNamePlaceholder}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label>{p.client}</Label>
            <Select value={clientId ?? ''} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder={p.selectClient} /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{p.pricingType}</Label>
              <Select value={pricingType} onValueChange={(v) => setPricingType(v as Project['pricing_type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRICING_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{p.pricing[opt]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{pricingType === 'Fixed' ? p.totalBudget : p.hourlyRate}</Label>
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{p.estimatedHours}</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label>{tr.common.status}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Project['status'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{p.statuses[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tr.common.cancel}</Button>
          <Button onClick={handleSave} disabled={!name.trim() || mutation.isPending}>
            {mutation.isPending
              ? (isEdit ? tr.common.saving : p.creating)
              : (isEdit ? tr.common.save : p.createProject)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ProjectsPage() {
  const { organization } = useAuthStore()
  const { tr } = useLang()
  const orgId = organization?.id ?? ''
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Project | undefined>()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', orgId],
    queryFn: () => fetchProjects(orgId),
    enabled: !!orgId,
  })

  const { data: progressSummary = {} } = useQuery({
    queryKey: ['projects-progress', orgId],
    queryFn: () => fetchProjectsProgressSummary(orgId),
    enabled: !!orgId,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projects-progress'] })
      setConfirmDelete(null)
    },
  })

  function openNew() { setEditing(undefined); setDialogOpen(true) }
  function openEdit(e: React.MouseEvent, project: Project) {
    e.preventDefault()
    e.stopPropagation()
    setEditing(project)
    setDialogOpen(true)
  }
  function onDeleteClick(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmDelete(id)
  }

  const p = tr.projects
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{p.title}</h1>
          <p className="text-muted-foreground text-sm">{projects.length} {tr.common.total}</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 me-2" /> {p.newProject}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{tr.common.loading}</p>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">{p.noProjects}</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const summary = progressSummary[project.id]
            let pct = 0
            let progressLabel = ''

            if ((project.estimated_hours ?? 0) > 0) {
              const logged = summary?.logged ?? 0
              pct = (logged / project.estimated_hours) * 100
              progressLabel = `${formatHours(logged)} / ${formatHours(project.estimated_hours)}`
            } else if (summary && summary.taskCount > 0) {
              pct = (summary.doneTaskCount / summary.taskCount) * 100
              progressLabel = `${summary.doneTaskCount}/${summary.taskCount} משימות`
            }

            const showProgress = (project.estimated_hours ?? 0) > 0
              || (!!summary && summary.taskCount > 0)

            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/projects/${project.id}`}
                      className="flex items-center gap-2 flex-1 min-w-0 hover:underline"
                    >
                      <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <CardTitle className="text-base leading-tight truncate">{project.name}</CardTitle>
                    </Link>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => openEdit(e, project)}
                        title={tr.common.edit}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {confirmDelete === project.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteMutation.mutate(project.id) }}
                          >
                            {tr.common.delete}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(null) }}
                          >
                            {tr.common.cancel}
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => onDeleteClick(e, project.id)}
                          title={tr.common.delete}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {project.client && (
                    <p className="text-xs text-muted-foreground">{project.client.name}</p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={STATUS_COLOR[project.status]} className="shrink-0 text-xs">
                      {p.statuses[project.status]}
                    </Badge>
                    <span className="text-sm font-semibold">
                      {project.pricing_type === 'Fixed'
                        ? formatCurrency(project.budget)
                        : `${formatCurrency(project.budget)}/hr`}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">{p.pricing[project.pricing_type]}</Badge>
                  {showProgress && <MiniProgress pct={pct} label={progressLabel} />}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <ProjectDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(undefined) }}
        orgId={orgId}
        initial={editing}
      />
    </div>
  )
}
