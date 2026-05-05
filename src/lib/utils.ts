import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Task, SubTask, TimeLog } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatElapsed(startTime: string): string {
  const start = new Date(startTime).getTime()
  const now = Date.now()
  const diff = Math.floor((now - start) / 1000)
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export function calcEHR(netProfit: number, totalHours: number): number {
  return totalHours > 0 ? netProfit / totalHours : 0
}

export function calcPartnerPayout(
  individualHours: number,
  totalHours: number,
  netProfit: number,
): number {
  return totalHours > 0 ? (individualHours / totalHours) * netProfit : 0
}

export function getMemberAttributedHours(memberId: string, logs: TimeLog[]): number {
  return logs.reduce((sum, log) => {
    if (!log.attributed_to.includes(memberId)) return sum
    return sum + log.hours / (log.attributed_to.length || 1)
  }, 0)
}

// ── Progress Calculations ─────────────────────────────────────────────────────

export interface ProgressResult {
  logged: number
  estimated: number
  pct: number
  isOver: boolean
}

export function calcTaskProgress(task: Task, logs: TimeLog[]): ProgressResult {
  const logged = logs
    .filter((l) => l.task_id === task.id)
    .reduce((s, l) => s + l.hours, 0)

  let pct: number
  if (task.estimated_hours > 0) {
    pct = (logged / task.estimated_hours) * 100
  } else {
    pct = task.status === 'Done' ? 100 : 0
  }

  return { logged, estimated: task.estimated_hours, pct, isOver: pct > 100 }
}

export function calcSubTaskProgress(subTask: SubTask, logs: TimeLog[]): ProgressResult {
  const logged = logs
    .filter((l) => l.sub_task_id === subTask.id)
    .reduce((s, l) => s + l.hours, 0)

  let pct: number
  if (subTask.estimated_hours > 0) {
    pct = (logged / subTask.estimated_hours) * 100
  } else {
    pct = subTask.status === 'Done' ? 100 : 0
  }

  return { logged, estimated: subTask.estimated_hours, pct, isOver: pct > 100 }
}

export interface ProjectProgressResult {
  totalLogged: number
  totalEstimated: number
  pct: number
  isOver: boolean
  basis: 'hours' | 'tasks'
}

export function calcProjectProgress(tasks: Task[], logs: TimeLog[]): ProjectProgressResult {
  const totalEstimated = tasks.reduce((s, t) => s + (t.estimated_hours || 0), 0)
  const totalLogged = logs.reduce((s, l) => s + l.hours, 0)

  if (totalEstimated > 0) {
    const pct = (totalLogged / totalEstimated) * 100
    return { totalLogged, totalEstimated, pct, isOver: pct > 100, basis: 'hours' }
  }

  const doneTasks = tasks.filter((t) => t.status === 'Done').length
  const pct = tasks.length > 0 ? (doneTasks / tasks.length) * 100 : 0
  return { totalLogged, totalEstimated: 0, pct, isOver: false, basis: 'tasks' }
}
