import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link2, Pencil, Trash2, ChevronDown, ChevronUp, Copy, Plus, Check } from 'lucide-react'
import {
  fetchProjectLinks,
  insertProjectLink,
  updateProjectLink,
  deleteProjectLink,
} from '@/lib/queries'
import { useLang } from '@/hooks/useLang'
import type { ProjectLink } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const CATEGORIES = ['Project', 'Client sites', 'Tools', 'Other'] as const

const ICON_BG: Record<string, string> = {
  Project: 'bg-blue-500',
  'Client sites': 'bg-green-500',
  Tools: 'bg-amber-500',
  Other: 'bg-gray-400',
}

const BADGE_CLS: Record<string, string> = {
  Project: 'bg-blue-100 text-blue-700',
  'Client sites': 'bg-green-100 text-green-700',
  Tools: 'bg-amber-100 text-amber-700',
  Other: 'bg-gray-100 text-gray-600',
}

interface LinkFormData {
  name: string
  url: string
  category: string
  username: string
  password: string
  notes: string
}

const emptyForm: LinkFormData = {
  name: '',
  url: '',
  category: 'Project',
  username: '',
  password: '',
  notes: '',
}

type LinkTranslations = {
  title: string
  addLink: string
  editLink: string
  noLinks: string
  name: string
  url: string
  category: string
  username: string
  password: string
  notes: string
  notesPlaceholder: string
  show: string
  hide: string
  copy: string
  categories: Record<string, string>
  saving: string
  save: string
  cancel: string
  details: string
}

function LinkDialog({
  open,
  onClose,
  form,
  setForm,
  l,
  isPending,
  onSave,
  isEdit,
}: {
  open: boolean
  onClose: () => void
  form: LinkFormData
  setForm: (f: LinkFormData) => void
  l: LinkTranslations
  isPending: boolean
  onSave: () => void
  isEdit: boolean
}) {
  function field(key: keyof LinkFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [key]: e.target.value })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? l.editLink : l.addLink}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <Label>{l.name}</Label>
              <Input value={form.name} onChange={field('name')} />
            </div>
            <div className="space-y-1">
              <Label>{l.url}</Label>
              <Input value={form.url} onChange={field('url')} placeholder="https://" />
            </div>
            <div className="space-y-1">
              <Label>{l.category}</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {l.categories[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{l.username}</Label>
              <Input value={form.username} onChange={field('username')} autoComplete="off" />
            </div>
            <div className="space-y-1">
              <Label>{l.password}</Label>
              {/* TODO: encrypt with pgcrypto in production — currently stored as plain text */}
              <Input type="text" value={form.password} onChange={field('password')} autoComplete="new-password" />
            </div>
            <div className="space-y-1">
              <Label>{l.notes}</Label>
              <Textarea
                value={form.notes}
                onChange={field('notes')}
                placeholder={l.notesPlaceholder}
                className="min-h-[60px]"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{l.cancel}</Button>
          <Button
            disabled={!form.name.trim() || !form.url.trim() || isPending}
            onClick={onSave}
          >
            {isPending ? l.saving : l.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface Props {
  projectId: string
  orgId: string
}

export function ProjectLinksTab({ projectId, orgId }: Props) {
  const qc = useQueryClient()
  const { tr } = useLang()
  const l = tr.links as unknown as LinkTranslations

  const [filter, setFilter] = useState('All')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showPwd, setShowPwd] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<LinkFormData>(emptyForm)
  const [copied, setCopied] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: links = [] } = useQuery({
    queryKey: ['project-links', projectId],
    queryFn: () => fetchProjectLinks(projectId),
    enabled: !!projectId,
  })

  const insertMut = useMutation({
    mutationFn: insertProjectLink,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-links', projectId] })
      setEditingId(null)
      setForm(emptyForm)
    },
  })

  const updateMut = useMutation({
    mutationFn: updateProjectLink,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-links', projectId] })
      setEditingId(null)
      setForm(emptyForm)
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteProjectLink,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-links', projectId] })
      setConfirmDelete(null)
    },
  })

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function togglePwd(id: string) {
    setShowPwd((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  function startEdit(link: ProjectLink) {
    setEditingId(link.id)
    setForm({
      name: link.name,
      url: link.url,
      category: link.category,
      username: link.username,
      password: link.password,
      notes: link.notes,
    })
  }

  function startNew() {
    setEditingId('new')
    setForm(emptyForm)
  }

  function handleSave() {
    if (editingId === 'new') {
      insertMut.mutate({ org_id: orgId, project_id: projectId, ...form })
    } else if (editingId) {
      updateMut.mutate({ id: editingId, ...form })
    }
  }

  const isPending = insertMut.isPending || updateMut.isPending
  const dialogOpen = editingId !== null
  const filtered = filter === 'All' ? links : links.filter((lnk) => lnk.category === filter)
  const counts = Object.fromEntries(
    CATEGORIES.map((cat) => [cat, links.filter((lnk) => lnk.category === cat).length]),
  )

  function closeDialog() { setEditingId(null); setForm(emptyForm) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{l.title}</h3>
        <Button size="sm" onClick={startNew}>
          <Plus className="h-3 w-3 me-1" /> {l.addLink}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['All', ...CATEGORIES] as const).map((cat) => {
          const count = cat === 'All' ? links.length : counts[cat]
          const label = cat === 'All' ? cat : l.categories[cat]
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                filter === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-transparent hover:border-border',
              )}
            >
              {label} ({count})
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">{l.noLinks}</p>
      )}

      <div className="space-y-2">
        {filtered.map((link) => {
          const isExpanded = expanded.has(link.id)
          const isPwdVisible = showPwd.has(link.id)
          const catBg = ICON_BG[link.category] ?? 'bg-gray-400'
          const catBadge = BADGE_CLS[link.category] ?? 'bg-gray-100 text-gray-600'
          const catLabel = l.categories[link.category] ?? link.category

          return (
            <div key={link.id} className="border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className={cn('h-8 w-8 rounded flex items-center justify-center shrink-0', catBg)}>
                  <Link2 className="h-4 w-4 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{link.name}</span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', catBadge)}>
                      {catLabel}
                    </span>
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline block truncate max-w-xs mt-0.5"
                  >
                    {link.url}
                  </a>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleExpand(link.id)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground"
                    title={l.details}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(link)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {confirmDelete === link.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-xs"
                        onClick={() => deleteMut.mutate(link.id)}
                      >
                        {tr.common.delete}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setConfirmDelete(null)}
                      >
                        {tr.common.cancel}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setConfirmDelete(link.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 ps-11 space-y-2 text-sm">
                  {link.username && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-32 shrink-0">{l.username}</span>
                      <span className="font-mono text-xs">{link.username}</span>
                    </div>
                  )}
                  {link.password && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-32 shrink-0">{l.password}</span>
                      <span className="font-mono text-xs">
                        {isPwdVisible ? link.password : '•'.repeat(Math.min(link.password.length, 12))}
                      </span>
                      <button
                        onClick={() => togglePwd(link.id)}
                        className="text-xs text-primary hover:underline ms-1"
                      >
                        {isPwdVisible ? l.hide : l.show}
                      </button>
                      <button
                        onClick={() => copyToClipboard(link.password, link.id)}
                        className="p-0.5 rounded hover:bg-muted text-muted-foreground ms-1"
                        title={l.copy}
                      >
                        {copied === link.id
                          ? <Check className="h-3.5 w-3.5 text-green-600" />
                          : <Copy className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>
                  )}
                  {link.notes && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-32 shrink-0">{l.notes}</span>
                      <span className="text-muted-foreground text-xs whitespace-pre-wrap">{link.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <LinkDialog
        open={dialogOpen}
        onClose={closeDialog}
        form={form}
        setForm={setForm}
        l={l}
        isPending={isPending}
        onSave={handleSave}
        isEdit={editingId !== null && editingId !== 'new'}
      />
    </div>
  )
}
