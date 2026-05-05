import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FolderOpen, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchProjects, upsertProject, fetchClients, deleteProject } from '@/lib/queries'
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
import { formatCurrency } from '@/lib/utils'

const STATUS_OPTIONS: Project['status'][] = ['Not Started', 'Active', 'In Review', 'Stuck', 'On Hold', 'Completed', 'Cancelled']
const STAGE_OPTIONS: Project['stage'][] = ['Not Started', 'In Progress', 'Done', 'Cancelled']
const PRICING_OPTIONS: Project['pricing_type'][] = ['Hourly', 'Fixed']

function ProjectDialog({
  open, onClose, initial, orgId,
}: {
  open: boolean
  onClose: () => void
  initial?: Project
  orgId: string
}) {
  const qc = useQueryClient()
  const { tr } = useLang()
  const [name, setName] = useState(initial?.name ?? '')
  const [clientId, setClientId] = useState(initial?.client_id ?? '')
  const [status, setStatus] = useState<Project['status']>(initial?.status ?? 'Active')
  const [stage, setStage] = useState<Project['stage']>(initial?.stage ?? 'Not Started')
  const [pricingType, setPricingType] = useState<Project['pricing_type']>(initial?.pricing_type ?? 'Fixed')
  const [budget, setBudget] = useState(initial?.budget?.toString() ?? '')

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setClientId(initial?.client_id ?? '')
    setStatus(initial?.status ?? 'Active')
    setStage(initial?.stage ?? 'Not Started')
    setPricingType(initial?.pricing_type ?? 'Fixed')
    setBudget(initial?.budget?.toString() ?? '')
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
      onClose()
    },
  })

  function handleSave() {
    mutation.mutate({
      ...(initial?.id ? { id: initial.id } : {}),
      org_id: orgId,
      name,
      client_id: clientId,
      status,
      stage,
      pricing_type: pricingType,
      budget: parseFloat(budget) || 0,
    })
  }

  const p = tr.projects
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? p.editProject : p.newProject}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>{p.projectName}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={p.projectNamePlaceholder} />
          </div>
          <div className="space-y-1">
            <Label>{p.client}</Label>
            <Select value={clientId} onValueChange={setClientId}>
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
                  {PRICING_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{p.pricing[opt]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{pricingType === 'Fixed' ? p.totalBudget : p.hourlyRate}</Label>
              <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{p.stage}</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as Project['stage'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{p.stages[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{tr.common.status}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Project['status'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{p.statuses[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tr.common.cancel}</Button>
          <Button onClick={handleSave} disabled={!name.trim() || mutation.isPending}>
            {mutation.isPending ? p.creating : (initial ? tr.common.save : p.createProject)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const STAGE_COLOR: Record<Project['stage'], 'default' | 'success' | 'warning' | 'secondary' | 'destructive'> = {
  'Not Started': 'secondary',
  'In Progress': 'warning',
  Done: 'success',
  Cancelled: 'destructive',
}

const STATUS_COLOR: Record<Project['status'], 'default' | 'success' | 'warning' | 'secondary' | 'destructive'> = {
  'Not Started': 'secondary',
  Active: 'success',
  'In Review': 'warning',
  Stuck: 'destructive',
  'On Hold': 'secondary',
  Completed: 'default',
  Cancelled: 'destructive',
}

export default function ProjectsPage() {
  const { organization } = useAuthStore()
  const { tr } = useLang()
  const orgId = organization?.id ?? ''
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Project | undefined>()

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', orgId],
    queryFn: () => fetchProjects(orgId),
    enabled: !!orgId,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  function openNew() { setEditing(undefined); setDialogOpen(true) }
  function openEdit(project: Project) { setEditing(project); setDialogOpen(true) }

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
          <CardContent className="py-12 text-center text-muted-foreground">
            {p.noProjects}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <CardTitle className="text-base leading-tight truncate">{project.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={STATUS_COLOR[project.status]}>{p.statuses[project.status]}</Badge>
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(project) }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteMutation.mutate(project.id) }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {project.client && (
                    <p className="text-xs text-muted-foreground">{project.client.name}</p>
                  )}
                  <Badge variant={STAGE_COLOR[project.stage]} className="text-xs">{p.stages[project.stage]}</Badge>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{p.pricing[project.pricing_type]}</Badge>
                    <span className="text-sm font-semibold">
                      {project.pricing_type === 'Fixed'
                        ? formatCurrency(project.budget)
                        : `${formatCurrency(project.budget)}/hr`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} initial={editing} orgId={orgId} />
    </div>
  )
}
