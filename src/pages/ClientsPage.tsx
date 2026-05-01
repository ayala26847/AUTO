import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { fetchClients, upsertClient, deleteClient } from '@/lib/queries'
import { useAuthStore } from '@/stores/authStore'
import type { Client } from '@/types'
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

const STATUS_OPTIONS = ['Active', 'Inactive', 'Prospect']

function ClientDialog({
  open, onClose, initial, orgId,
}: {
  open: boolean
  onClose: () => void
  initial?: Client
  orgId: string
}) {
  const qc = useQueryClient()
  const [name, setName] = useState(initial?.name ?? '')
  const [status, setStatus] = useState(initial?.status ?? 'Active')
  const [email, setEmail] = useState(initial?.contact_info?.email ?? '')
  const [phone, setPhone] = useState(initial?.contact_info?.phone ?? '')

  const mutation = useMutation({
    mutationFn: upsertClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      onClose()
    },
  })

  function handleSave() {
    mutation.mutate({
      ...(initial?.id ? { id: initial.id } : {}),
      org_id: orgId,
      name,
      status,
      contact_info: { email, phone },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Client' : 'New Client'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
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

export default function ClientsPage() {
  const { organization } = useAuthStore()
  const orgId = organization?.id ?? ''
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | undefined>()

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', orgId],
    queryFn: () => fetchClients(orgId),
    enabled: !!orgId,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })

  function openNew() { setEditing(undefined); setDialogOpen(true) }
  function openEdit(c: Client) { setEditing(c); setDialogOpen(true) }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground text-sm">{clients.length} total</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> New Client
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No clients yet. Add your first client.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{client.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(client)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(client.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant={client.status === 'Active' ? 'success' : 'secondary'}>{client.status}</Badge>
                {client.contact_info?.email && (
                  <p className="text-xs text-muted-foreground">{client.contact_info.email}</p>
                )}
                {client.contact_info?.phone && (
                  <p className="text-xs text-muted-foreground">{client.contact_info.phone}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClientDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={editing}
        orgId={orgId}
      />
    </div>
  )
}
