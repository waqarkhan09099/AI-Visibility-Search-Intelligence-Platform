import { Link } from 'react-router-dom'
import { ArrowRight, Database, Loader2, Plus, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { OpportunityChart } from '@/components/charts/OpportunityChart'
import { AIProviderStatusBanner } from '@/components/common/AIProviderStatusBanner'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useDashboard, useOpportunityChart } from '@/features/dashboard/hooks/useDashboard'
import { useAIConfig } from '@/features/settings/hooks/useAIConfig'

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
}) {
  if (loading) return <Skeleton className="h-28 rounded-xl" />
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboard()
  const chart = useOpportunityChart()
  const aiConfig = useAIConfig()

  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">AI visibility intelligence overview</p>
        </div>
        <Button asChild>
          <Link to="/profiles/new">
            <Plus className="h-4 w-4" />
            Create Profile
          </Link>
        </Button>
      </div>

      {!aiConfig.isLoading && aiConfig.data && (
        <AIProviderStatusBanner summary={aiConfig.data.summary} compact />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Profiles" value={data?.total_profiles ?? 0} icon={Users} loading={isLoading} />
        <StatCard
          title="Avg Opportunity"
          value={data?.average_opportunity ?? 0}
          icon={TrendingUp}
          loading={isLoading}
        />
        <StatCard title="Total Queries" value={data?.total_queries ?? 0} icon={Database} loading={isLoading} />
        <StatCard
          title="Pipeline Status"
          value={data?.pipeline_status === 'running' ? 'Running' : 'Idle'}
          icon={data?.pipeline_status === 'running' ? Loader2 : Database}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OpportunityChart data={chart.data} loading={chart.isLoading} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Profiles</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/profiles">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            {!isLoading && data?.recent_profiles.length === 0 && (
              <EmptyState
                title="No profiles yet"
                description="Create your first profile to start analyzing AI visibility."
                action={
                  <Button asChild>
                    <Link to="/profiles/new">Create Profile</Link>
                  </Button>
                }
              />
            )}
            {data?.recent_profiles.map((profile) => (
              <Link
                key={profile.id}
                to={`/profiles/${profile.id}`}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{profile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.domain} · {profile.industry}
                  </p>
                  <p className="mt-1 text-sm">
                    Avg opportunity: <span className="font-medium">{profile.avg_opportunity}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={profile.run_status} />
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
