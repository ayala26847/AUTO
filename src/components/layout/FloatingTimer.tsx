import { Timer, Square } from 'lucide-react'
import { useTimer } from '@/hooks/useTimer'
import { Button } from '@/components/ui/button'

export default function FloatingTimer() {
  const { activeTimer, elapsedSeconds, isRunning, handleStop, isStopping } = useTimer()

  if (!isRunning || !activeTimer) return null

  const h = Math.floor(elapsedSeconds / 3600)
  const m = Math.floor((elapsedSeconds % 3600) / 60)
  const s = elapsedSeconds % 60
  const display = [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-blue-600 text-white px-4 py-3 rounded-full shadow-2xl">
      <Timer className="h-4 w-4 animate-pulse" />
      <div className="text-sm">
        <span className="font-mono font-semibold">{display}</span>
        {activeTimer.project && (
          <span className="ml-2 opacity-80 text-xs truncate max-w-[120px]">
            {activeTimer.project.name}
          </span>
        )}
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 rounded-full hover:bg-blue-700 text-white"
        onClick={() => handleStop()}
        disabled={isStopping}
      >
        <Square className="h-3 w-3 fill-current" />
      </Button>
    </div>
  )
}
