import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Play, Square, Plus, Trash2, ChevronDown, ChevronUp,
  GripVertical, Clock, AlertTriangle, Check,
} from 'lucide-react'
import { cn, formatHours, calcTaskProgress, calcSubTaskProgress } from '@/lib/utils'
import type { Task, SubTask, TimeLog, User, ActiveTimer } from '@/types'
import { useLang } from '@/hooks/useLang'
import {
  upsertTask, upsertSubTask, deleteTask, deleteSubTask, insertTimeLog,
} from '@/lib/queries'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { MemberPicker } from '@/components/ui/member-picker'

const KANBAN_STATUSES = ['Backlog', 'In Progress', 'Review', 'Done'] as const

// ── Shared: Progress Bar ──────────────────────────────────────────────────────

interface ProgressBarProps {
  pct: number
  logged: number
  estimated: number
  compact?: boolean
}

export function ProgressBar({ pct, logged, estimated, compact }: ProgressBarProps) {
  const isOver = pct > 100
  const displayPct = Math.min(pct, 100)

  return (
    <div className={cn('space-y-0.5', compact && 'space-y-px')}>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">
          {formatHours(logged)}{estimated > 0 ? ` / ${formatHours(estimated)}` : ''}
        </span>
        <span className={cn('font-medium tabular-nums', isOver ? 'text-red-600' : 'text-muted-foreground')}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className={cn('rounded-full bg-muted overflow-hidden', compact ? 'h-1' : 'h-1.5')}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isOver ? 'bg-red-500' : pct >= 100 ? 'bg-green-500' : 'bg-primary',
          )}
          style={{ width: `${displayPct}%` }}
        />
      </div>
    </div>
  )
}

// ── Shared: Inline Hours Edit ─────────────────────────────────────────────────

interface InlineHoursEditProps {
  value: number
  onSave: (v: number) => void
  label?: string
}

function InlineHoursEdit({ value, onSave, label }: InlineHoursEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  function commit() {
    const n = parseFloat(draft)
    if (!isNaN(n) && n >= 0) onSave(n)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        className="w-16 h-5 text-xs border rounded px-1 font-mono bg-background"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        type="number"
        min="0"
        step="0.5"
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(String(value || '')); setEditing(true) }}
      className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors font-mono"
      title={label || 'לחץ לעריכת שעות מתוכננות'}
    >
      {value > 0 ? formatHours(value) : '+ הערך'}
    </button>
  )
}

// ── Shared: Stop Timer Panel ──────────────────────────────────────────────────

interface StopTimerPanelProps {
  elapsedSeconds: number
  members: User[]
  attribution: string[]
  onAttributionChange: (ids: string[]) => void
  onStop: () => void
  isStopping: boolean
}

function StopTimerPanel({
  elapsedSeconds, members, attribution, onAttributionChange, onStop, isStopping,
}: StopTimerPanelProps) {
  const h = Math.floor(elapsedSeconds / 3600)
  const m = Math.floor((elapsedSeconds % 3600) / 60)
  const s = elapsedSeconds % 60
  const display = [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')

  return (
    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-md space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold text-blue-700 animate-pulse">{display}</span>
        <span className="text-xs text-blue-600">רץ כרגע</span>
      </div>
      <MemberPicker
        members={members}
        selected={attribution}
        onChange={onAttributionChange}
        label="מי עבד?"
        selectAllLabel="כולם"
      />
      <Button
        size="sm"
        className="h-7 text-xs w-full bg-blue-600 hover:bg-blue-700"
        disabled={isStopping || attribution.length === 0}
        onClick={onStop}
      >
        {isStopping ? 'שומר...' : 'עצור ושמור'}
      </Button>
    </div>
  )
}

// ── Shared: Manual Log Form ───────────────────────────────────────────────────

interface ManualLogFormProps {
  members: User[]
  defaultAttributedTo: string[]
  onSubmit: (hours: number, desc: string, attributedTo: string[]) => void
  isPending: boolean
  onCancel: () => void
}

function ManualLogForm({ members, defaultAttributedTo, onSubmit, isPending, onCancel }: ManualLogFormProps) {
  const [hours, setHours] = useState('')
  const [desc, setDesc] = useState('')
  const [attributedTo, setAttributedTo] = useState<string[]>(defaultAttributedTo)

  function handleSubmit() {
    const h = parseFloat(hours)
    if (isNaN(h) || h <= 0 || attributedTo.length === 0) return
    onSubmit(h, desc, attributedTo)
  }

  return (
    <div className="p-2.5 bg-muted/40 border rounded-md space-y-2">
      <div className="flex gap-2">
        <Input
          type="number"
          step="0.25"
          min="0.25"
          placeholder="שעות"
          className="h-7 text-xs w-20"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <Input
          placeholder="תיאור (אופציונלי)"
          className="h-7 text-xs flex-1"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
      </div>
      <MemberPicker
        members={members}
        selected={attributedTo}
        onChange={setAttributedTo}
        label="מי עבד?"
        selectAllLabel="כולם"
      />
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onCancel}>
          ביטול
        </Button>
        <Button
          size="sm"
          className="h-6 text-xs"
          disabled={!hours || parseFloat(hours) <= 0 || attributedTo.length === 0 || isPending}
          onClick={handleSubmit}
        >
          {isPending ? 'שומר...' : <><Check className="h-3 w-3 me-1" />הוסף</>}
        </Button>
      </div>
    </div>
  )
}

// ── Sub-task Row ──────────────────────────────────────────────────────────────

interface SubTaskRowProps {
  subTask: SubTask
  projectId: string
  orgId: string
  members: User[]
  timeLogs: TimeLog[]
  activeTimer: ActiveTimer | null
  elapsedSeconds: number
  isRunning: boolean
  isStopping: boolean
  onStart: (subTaskId: string) => void
  onStop: (attribution: string[]) => void
  invalidate: () => void
}

function SubTaskRow({
  subTask, projectId, orgId, members, timeLogs,
  activeTimer, elapsedSeconds, isRunning, isStopping,
  onStart, onStop, invalidate,
}: SubTaskRowProps) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { tr } = useLang()
  const [showManualLog, setShowManualLog] = useState(false)
  const [showStopPanel, setShowStopPanel] = useState(false)
  const [stopAttribution, setStopAttribution] = useState<string[]>(() => user ? [user.id] : [])
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isMyTimer =
    isRunning &&
    activeTimer?.task_id === subTask.task_id &&
    activeTimer?.sub_task_id === subTask.id

  const updateMut = useMutation({
    mutationFn: upsertSubTask,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sub-tasks', projectId] }); invalidate() },
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteSubTask(subTask.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sub-tasks', projectId] }); invalidate() },
  })

  const logMut = useMutation({
    mutationFn: insertTimeLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-time-logs', projectId] })
      qc.invalidateQueries({ queryKey: ['time-logs'] })
      setShowManualLog(false)
      invalidate()
    },
  })

  const { pct, logged } = calcSubTaskProgress(subTask, timeLogs)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { assignee: _a, ...subTaskData } = subTask

  const statusLabels: Record<SubTask['status'], string> = {
    Backlog: tr.projectDetail.taskStatuses.Backlog,
    'In Progress': tr.projectDetail.taskStatuses['In Progress'],
    Review: tr.projectDetail.taskStatuses.Review,
    Done: tr.projectDetail.taskStatuses.Done,
  }

  return (
    <div className="ms-4 ps-3 border-l-2 border-dashed border-muted-foreground/20">
      <div className="flex items-start gap-2 py-1.5 group/sub">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium">{subTask.title}</span>
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-medium',
              subTask.status === 'Done'
                ? 'bg-green-100 text-green-700'
                : 'bg-muted text-muted-foreground',
            )}>
              {statusLabels[subTask.status]}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
            <InlineHoursEdit
              value={subTask.estimated_hours}
              onSave={(v) => updateMut.mutate({ ...subTaskData, estimated_hours: v })}
            />
          </div>

          {(subTask.estimated_hours > 0 || logged > 0) && (
            <ProgressBar pct={pct} logged={logged} estimated={subTask.estimated_hours} compact />
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/sub:opacity-100 transition-opacity">
          {isMyTimer ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-blue-600 hover:text-blue-800"
              onClick={() => setShowStopPanel(!showStopPanel)}
            >
              <Square className="h-3 w-3 fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-primary"
              onClick={() => onStart(subTask.id)}
              disabled={isRunning && !isMyTimer}
              title={isRunning && !isMyTimer ? 'טיימר פעיל על משימה אחרת' : 'התחל טיימר'}
            >
              <Play className="h-3 w-3" />
            </Button>
          )}

          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setShowManualLog(!showManualLog)}
            title="הוסף שעות ידנית"
          >
            <Clock className="h-3 w-3" />
          </Button>

          <Select
            value={subTask.status}
            onValueChange={(v) => updateMut.mutate({ ...subTaskData, status: v as SubTask['status'] })}
          >
            <SelectTrigger className="h-6 w-[7rem] text-xs px-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KANBAN_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {confirmDelete ? (
            <div className="flex gap-1">
              <Button size="sm" variant="destructive" className="h-6 px-1.5 text-xs" onClick={() => deleteMut.mutate()}>
                מחק
              </Button>
              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => setConfirmDelete(false)}>
                ×
              </Button>
            </div>
          ) : (
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {isMyTimer && showStopPanel && (
        <StopTimerPanel
          elapsedSeconds={elapsedSeconds}
          members={members}
          attribution={stopAttribution}
          onAttributionChange={setStopAttribution}
          onStop={() => { onStop(stopAttribution); setShowStopPanel(false) }}
          isStopping={isStopping}
        />
      )}

      {showManualLog && (
        <ManualLogForm
          members={members}
          defaultAttributedTo={user ? [user.id] : []}
          isPending={logMut.isPending}
          onCancel={() => setShowManualLog(false)}
          onSubmit={(hours, desc, attributedTo) => {
            if (!user) return
            logMut.mutate({
              org_id: orgId,
              project_id: projectId,
              user_id: user.id,
              task_id: subTask.task_id,
              sub_task_id: subTask.id,
              hours,
              description: desc,
              attributed_to: attributedTo,
            })
          }}
        />
      )}
    </div>
  )
}

// ── Main: TaskCard ────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task
  projectId: string
  orgId: string
  members: User[]
  subTasks: SubTask[]
  timeLogs: TimeLog[]
  activeTimer: ActiveTimer | null
  elapsedSeconds: number
  isRunning: boolean
  isStopping: boolean
  onStart: (taskId: string, subTaskId?: string | null) => void
  onStop: (attribution: string[]) => void
  onTaskDeleted: (id: string) => void
  onInvalidate: () => void
}

export function TaskCard({
  task, projectId, orgId, members, subTasks, timeLogs,
  activeTimer, elapsedSeconds, isRunning, isStopping,
  onStart, onStop, onTaskDeleted, onInvalidate,
}: TaskCardProps) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { tr } = useLang()

  const [showSubTasks, setShowSubTasks] = useState(false)
  const [showManualLog, setShowManualLog] = useState(false)
  const [showStopPanel, setShowStopPanel] = useState(false)
  const [addingSubTask, setAddingSubTask] = useState(false)
  const [newSubTitle, setNewSubTitle] = useState('')
  const [stopAttribution, setStopAttribution] = useState<string[]>(() => user ? [user.id] : [])
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isMyTimer =
    isRunning &&
    activeTimer?.task_id === task.id &&
    !activeTimer?.sub_task_id

  const taskLogs = timeLogs.filter((l) => l.task_id === task.id)
  const { pct, logged } = calcTaskProgress(task, taskLogs)

  const taskSubTasks = subTasks.filter((s) => s.task_id === task.id)
  const totalSubEstimated = taskSubTasks.reduce((s, t) => s + t.estimated_hours, 0)
  const subTasksExceed = task.estimated_hours > 0 && totalSubEstimated > task.estimated_hours

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { assignee: _a, ...taskData } = task

  const updateMut = useMutation({
    mutationFn: upsertTask,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks', projectId] }); onInvalidate() },
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] })
      onTaskDeleted(task.id)
    },
  })

  const addSubMut = useMutation({
    mutationFn: upsertSubTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-tasks', projectId] })
      setNewSubTitle('')
      setAddingSubTask(false)
      onInvalidate()
    },
  })

  const logMut = useMutation({
    mutationFn: insertTimeLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-time-logs', projectId] })
      qc.invalidateQueries({ queryKey: ['time-logs'] })
      setShowManualLog(false)
      onInvalidate()
    },
  })

  const pd = tr.projectDetail

  const statusLabels: Record<Task['status'], string> = {
    Backlog: pd.taskStatuses.Backlog,
    'In Progress': pd.taskStatuses['In Progress'],
    Review: pd.taskStatuses.Review,
    Done: pd.taskStatuses.Done,
  }

  // ── Inline Note ──────────────────────────────────────────────────────────
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState(task.note ?? '')

  function saveNote() {
    if (noteDraft !== (task.note ?? '')) {
      updateMut.mutate({ ...taskData, note: noteDraft || null })
    }
    setEditingNote(false)
  }

  return (
    <div className={cn(
      'border rounded-lg bg-card transition-all duration-200 group',
      isMyTimer && 'border-blue-400 shadow-md shadow-blue-50',
    )}>
      <div className="p-3 space-y-2.5">

        {/* ── Header ── */}
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug">{task.title}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {task.assignee && (
                <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
              )}
              {task.due_date && (
                <span className="text-xs text-muted-foreground">{task.due_date}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {isMyTimer ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                onClick={() => setShowStopPanel(!showStopPanel)}
                disabled={isStopping}
                title="עצור טיימר"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  'h-7 w-7 text-muted-foreground hover:text-primary transition-opacity',
                  'opacity-0 group-hover:opacity-100',
                )}
                onClick={() => onStart(task.id, null)}
                disabled={isRunning && !isMyTimer}
                title={isRunning && !isMyTimer ? 'טיימר פעיל על משימה אחרת' : 'התחל טיימר'}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            )}

            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setShowManualLog(!showManualLog)}
              title="הוסף שעות ידנית"
            >
              <Clock className="h-3.5 w-3.5" />
            </Button>

            {confirmDelete ? (
              <div className="flex gap-1">
                <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => deleteMut.mutate()}>
                  מחק
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmDelete(false)}>
                  ×
                </Button>
              </div>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* ── Estimated Hours + Progress ── */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
            <InlineHoursEdit
              value={task.estimated_hours}
              onSave={(v) => updateMut.mutate({ ...taskData, estimated_hours: v })}
              label="לחץ לעריכת שעות מתוכננות"
            />
            {subTasksExceed && taskSubTasks.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <AlertTriangle className="h-3 w-3" />
                תת-משימות עולות ({formatHours(totalSubEstimated)})
              </span>
            )}
          </div>

          {(task.estimated_hours > 0 || logged > 0) && (
            <ProgressBar pct={pct} logged={logged} estimated={task.estimated_hours} />
          )}
        </div>

        {/* ── Status + Sub-tasks toggle ── */}
        <div className="flex gap-2 items-center">
          <Select
            value={task.status}
            onValueChange={(v) => updateMut.mutate({ ...taskData, status: v as Task['status'] })}
          >
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KANBAN_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setShowSubTasks(!showSubTasks)}
          >
            {showSubTasks ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {taskSubTasks.length > 0 ? `${taskSubTasks.length} תת-משימות` : 'תת-משימות'}
          </Button>
        </div>

        {/* ── Inline Note ── */}
        <div className="flex items-start gap-1.5 min-h-[24px]">
          {editingNote ? (
            <textarea
              autoFocus
              className="flex-1 text-xs border rounded px-2 py-1 resize-none bg-background leading-relaxed"
              rows={2}
              placeholder="הערה... (מה תקוע, מה להמשיך, מה לבדוק)"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={saveNote}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setNoteDraft(task.note ?? ''); setEditingNote(false) }
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote() }
              }}
            />
          ) : (
            <button
              className={cn(
                'flex-1 text-start text-xs rounded px-1.5 py-1 transition-colors group/note',
                'hover:bg-muted/60',
                task.note ? 'text-foreground' : 'text-muted-foreground/50 italic',
              )}
              onClick={() => { setNoteDraft(task.note ?? ''); setEditingNote(true) }}
              title="לחץ לעריכת הערה"
            >
              <span className="flex items-center gap-1.5">
                {task.note
                  ? task.note
                  : <span className="opacity-0 group-hover/note:opacity-100 transition-opacity">+ הערה</span>
                }
              </span>
            </button>
          )}
        </div>

        {/* ── Stop Timer Panel ── */}
        {showStopPanel && isMyTimer && (
          <StopTimerPanel
            elapsedSeconds={elapsedSeconds}
            members={members}
            attribution={stopAttribution}
            onAttributionChange={setStopAttribution}
            onStop={() => { onStop(stopAttribution); setShowStopPanel(false) }}
            isStopping={isStopping}
          />
        )}

        {/* ── Manual Log Form ── */}
        {showManualLog && (
          <ManualLogForm
            members={members}
            defaultAttributedTo={user ? [user.id] : []}
            isPending={logMut.isPending}
            onCancel={() => setShowManualLog(false)}
            onSubmit={(hours, desc, attributedTo) => {
              if (!user) return
              logMut.mutate({
                org_id: orgId,
                project_id: projectId,
                user_id: user.id,
                task_id: task.id,
                sub_task_id: null,
                hours,
                description: desc,
                attributed_to: attributedTo,
              })
            }}
          />
        )}

        {/* ── Sub-tasks ── */}
        {showSubTasks && (
          <div className="space-y-1 pt-1">
            {taskSubTasks.map((sub) => (
              <SubTaskRow
                key={sub.id}
                subTask={sub}
                projectId={projectId}
                orgId={orgId}
                members={members}
                timeLogs={timeLogs}
                activeTimer={activeTimer}
                elapsedSeconds={elapsedSeconds}
                isRunning={isRunning}
                isStopping={isStopping}
                onStart={(subTaskId) => onStart(task.id, subTaskId)}
                onStop={(attribution) => onStop(attribution)}
                invalidate={onInvalidate}
              />
            ))}

            {addingSubTask ? (
              <div className="ms-4 ps-3 border-l-2 border-dashed border-muted-foreground/20 pb-1">
                <Input
                  autoFocus
                  className="h-7 text-xs"
                  placeholder="כותרת תת-משימה... (Enter לשמור, Esc לביטול)"
                  value={newSubTitle}
                  onChange={(e) => setNewSubTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSubTitle.trim()) {
                      addSubMut.mutate({
                        org_id: orgId,
                        task_id: task.id,
                        project_id: projectId,
                        title: newSubTitle.trim(),
                        estimated_hours: 0,
                        assigned_to: null,
                        status: 'Backlog',
                      })
                    }
                    if (e.key === 'Escape') {
                      setAddingSubTask(false)
                      setNewSubTitle('')
                    }
                  }}
                />
              </div>
            ) : (
              <button
                className="ms-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-0.5"
                onClick={() => setAddingSubTask(true)}
              >
                <Plus className="h-3 w-3" />
                {pd.addSubTask ?? 'הוסף תת-משימה'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
