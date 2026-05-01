import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { TimeLog } from '@/types'

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

// Hours a member is attributed across a set of logs (split equally among attributed_to per log)
export function getMemberAttributedHours(memberId: string, logs: TimeLog[]): number {
  return logs.reduce((sum, log) => {
    if (!log.attributed_to.includes(memberId)) return sum
    return sum + log.hours / (log.attributed_to.length || 1)
  }, 0)
}
