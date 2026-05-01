import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { fetchLeads, upsertLead, deleteLead } from '@/lib/queries'
import { useAuthStore } from '@/stores/authStore'
import type { Lead } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const STATUSES: Lead['status'][] = ['New', 'Negotiating', 'Closed', 'Lost']

const STATUS_COLORS: Record<Lead['status'], 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  New: 'default',
  Negotiating: 'warning',
  Closed: 'success',
  Lost: 'destructive',
}

const COLUMNS: Lead['status'][] = ['New', 'Negotiating', 'Closed', 'Lost']

function LeadDialog({
  open, onClose, initial, orgId,
}: {
  open: boolean
  onClose: () => void
  initial?: Lead
  orgId: string
}) {
  const qc = useQueryClient()
  const [name, setName] = useState(initial?.name ?? '')
  const [status, setStatus] = useState<Lead['status']>(initial?.status ?? 'New')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [email, setEmail] = useState(initial?.contact_info?.email ?? '')

  const mutation = useMutation({
    mutationFn: upsertLead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      onClose()
    },
  })

  function handleSave() {
    mutation.mutate({
      ...(initial?.id ? { id: initial.id } : {}),
      org_id: orgId,
      name,
      status,
      notes,
      contact_info: { email },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Lead' : 'New Lead'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name / Company</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Lead['status'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function LeadsPage() {
  const { organization } = useAuthStore()
  const orgId = organization?.id ?? ''
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | undefined>()

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', orgId],
    queryFn: () => fetchLeads(orgId),
    enabled: !!orgId,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })

  function openNew() { setEditing(undefined); setDialogOpen(true) }
  function openEdit(l: Lead) { setEditing(l); setDialogOpen(true) }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground text-sm">{leads.length} total</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> New Lead
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colLeads = leads.filter((l) => l.status === col)
            return (
              <div key={col} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_COLORS[col]}>{col}</Badge>
                  <span className="text-xs text-muted-foreground">{colLeads.length}</span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {colLeads.map((lead) => (
                    <Card key={lead.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-1 pt-3 px-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm font-medium">{lead.name}</CardTitle>
                          <div className="flex gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(lead)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate(lead.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {(lead.contact_info?.email || lead.notes) && (
                        <CardContent className="px-3 pb-3 pt-0">
                          {lead.contact_info?.email && (
                            <p className="text-xs text-muted-foreground truncate">{lead.contact_info.email}</p>
                          )}
                          {lead.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{lead.notes}</p>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <LeadDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={editing}
        orgId={orgId}
      />
    </div>
  )
}
