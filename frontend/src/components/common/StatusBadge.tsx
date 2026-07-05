import { cn } from '@/utils/cn'
import type { RunStatus, QueryStatus } from '@/types'
import { Badge } from '@/components/ui/badge'

const statusStyles: Record<string, string> = {
  idle: 'bg-muted text-muted-foreground',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-muted text-muted-foreground',
  scored: 'bg-emerald-100 text-emerald-700',
  rechecking: 'bg-amber-100 text-amber-700',
  scoring: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-blue-100 text-blue-700',
}

interface StatusBadgeProps {
  status: RunStatus | QueryStatus | string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge className={cn(statusStyles[status] || statusStyles.idle, className)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}
