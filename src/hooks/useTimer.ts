import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchActiveTimer, startTimer, stopTimer, insertTimeLog } from '@/lib/queries'
import { useTimerStore } from '@/stores/timerStore'
import { useAuthStore } from '@/stores/authStore'

const AUTO_STOP_SECONDS = 8 * 3600

export function useTimer() {
  const { user, organization } = useAuthStore()
  const { activeTimer, elapsedSeconds, setActiveTimer, tick } = useTimerStore()
  const queryClient = useQueryClient()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: remoteTimer } = useQuery({
    queryKey: ['active-timer', user?.id],
    queryFn: () => fetchActiveTimer(user!.id),
    enabled: !!user,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (remoteTimer !== undefined) {
      setActiveTimer(remoteTimer)
    }
  }, [remoteTimer])

  useEffect(() => {
    if (activeTimer) {
      intervalRef.current = setInterval(() => {
        tick()
        if (elapsedSeconds >= AUTO_STOP_SECONDS) {
          handleStop()
        }
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [activeTimer])

  const startMutation = useMutation({
    mutationFn: startTimer,
    onSuccess: (timer) => {
      setActiveTimer(timer)
      queryClient.invalidateQueries({ queryKey: ['active-timer'] })
    },
  })

  const stopMutation = useMutation({
    mutationFn: async (attributedTo?: string[]) => {
      if (!activeTimer || !user || !organization) return
      const hours = elapsedSeconds / 3600
      const ids = attributedTo && attributedTo.length > 0 ? attributedTo : [user.id]
      await stopTimer(activeTimer.id)
      await insertTimeLog({
        org_id: organization.id,
        project_id: activeTimer.project_id,
        user_id: user.id,
        task_id: activeTimer.task_id,
        hours: Math.round(hours * 100) / 100,
        description: '',
        attributed_to: ids,
      })
    },
    onSuccess: () => {
      setActiveTimer(null)
      queryClient.invalidateQueries({ queryKey: ['active-timer'] })
      queryClient.invalidateQueries({ queryKey: ['time-logs'] })
    },
  })

  async function handleStart(projectId: string, taskId: string | null) {
    if (!user || !organization) return
    startMutation.mutate({
      user_id: user.id,
      org_id: organization.id,
      project_id: projectId,
      task_id: taskId,
      start_time: new Date().toISOString(),
    })
  }

  function handleStop(attributedTo?: string[]) {
    stopMutation.mutate(attributedTo)
  }

  return {
    activeTimer,
    elapsedSeconds,
    isRunning: !!activeTimer,
    handleStart,
    handleStop,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
  }
}
