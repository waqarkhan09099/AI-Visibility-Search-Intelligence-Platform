import { cn } from '@/utils/cn'

interface ScoreProgressBarProps {
  score: number
  className?: string
}

export function ScoreProgressBar({ score, className }: ScoreProgressBarProps) {
  const color =
    score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-medium tabular-nums">{score}</span>
    </div>
  )
}
