import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations'
import type { Priority, Recommendation } from '@/types'

const priorityOrder: Priority[] = ['high', 'medium', 'low']
const priorityLabels: Record<Priority, string> = {
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Low Priority',
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{rec.title}</CardTitle>
          <StatusBadge status={rec.priority} />
        </div>
        <p className="text-sm text-muted-foreground">{rec.content_type}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{rec.rationale}</p>
        <div className="flex flex-wrap gap-2">
          {rec.keywords.map((kw) => (
            <Badge key={kw} variant="outline" className="bg-muted/50">
              {kw}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface RecommendationsTabProps {
  profileId: number
}

export function RecommendationsTab({ profileId }: RecommendationsTabProps) {
  const { data, isLoading, isError, refetch } = useRecommendations(profileId)

  if (isError) return <ErrorState onRetry={() => refetch()} />

  if (isLoading) {
    return (
      <div className="space-y-6">
        {priorityOrder.map((p) => (
          <div key={p} className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    )
  }

  const hasAny = priorityOrder.some((p) => (data?.[p]?.length ?? 0) > 0)
  if (!hasAny) {
    return (
      <EmptyState
        title="No recommendations yet"
        description="Run the pipeline to generate AI visibility recommendations."
      />
    )
  }

  return (
    <div className="space-y-8">
      {priorityOrder.map((priority) => {
        const items = data?.[priority] ?? []
        if (items.length === 0) return null
        return (
          <section key={priority} className="space-y-4">
            <h3 className="text-lg font-semibold">{priorityLabels[priority]}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
