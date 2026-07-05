import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { usePipelineRuns } from '@/features/pipeline/hooks/usePipeline'
import { formatDate } from '@/utils/cn'
import type { PipelineRun } from '@/types'

function StatusIcon({ status }: { status: PipelineRun['status'] }) {
  if (status === 'running') return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
  if (status === 'completed') return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
  return <XCircle className="h-5 w-5 text-red-500" />
}

function formatDuration(started: string, completed: string | null): string {
  if (!completed) return 'In progress'
  const ms = new Date(completed).getTime() - new Date(started).getTime()
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

interface PipelineHistoryTabProps {
  profileId: number
}

export function PipelineHistoryTab({ profileId }: PipelineHistoryTabProps) {
  const { data, isLoading, isError, refetch } = usePipelineRuns(profileId)

  if (isError) return <ErrorState onRetry={() => refetch()} />

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <EmptyState
        title="No pipeline runs yet"
        description="Click Run Pipeline to start analyzing queries."
      />
    )
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute left-6 top-4 bottom-4 w-px bg-border" />
      {data.map((run) => (
        <div key={run.id} className="relative flex gap-4 pb-8 pl-2">
          <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background">
            <StatusIcon status={run.status} />
          </div>
          <Card className="flex-1">
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Run #{run.id}</span>
                  <StatusBadge status={run.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Started {formatDate(run.started_at)}
                  {run.completed_at && ` · Completed ${formatDate(run.completed_at)}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Model: {run.model_id} ({run.provider}) · Stage: {run.stage}
                </p>
                {run.error_message && (
                  <p className="text-sm text-red-600">{run.error_message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Duration: {formatDuration(run.started_at, run.completed_at)}
                </p>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-muted-foreground">Queries scored</p>
                  <p className="font-semibold">{run.queries_scored}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tokens used</p>
                  <p className="font-semibold">{run.tokens_used.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
