import { create } from 'zustand'
import type { ActiveTimer } from '@/types'

interface TimerState {
  activeTimer: ActiveTimer | null
  elapsedSeconds: number
  setActiveTimer: (timer: ActiveTimer | null) => void
  tick: () => void
  resetElapsed: () => void
}

export const useTimerStore = create<TimerState>((set, get) => ({
  activeTimer: null,
  elapsedSeconds: 0,
  setActiveTimer: (timer) => {
    if (timer) {
      const start = new Date(timer.start_time).getTime()
      const elapsed = Math.floor((Date.now() - start) / 1000)
      set({ activeTimer: timer, elapsedSeconds: elapsed })
    } else {
      set({ activeTimer: null, elapsedSeconds: 0 })
    }
  },
  tick: () => {
    if (get().activeTimer) {
      set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 }))
    }
  },
  resetElapsed: () => set({ elapsedSeconds: 0 }),
}))
