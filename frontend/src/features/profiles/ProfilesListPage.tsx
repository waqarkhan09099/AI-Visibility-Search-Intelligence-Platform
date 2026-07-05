import { Link } from 'react-router-dom'
import { ArrowRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useProfiles } from '@/features/profiles/hooks/useProfiles'
import { formatDate } from '@/utils/cn'

export function ProfilesListPage() {
  const { data, isLoading, isError, refetch } = useProfiles()

  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profiles</h1>
          <p className="text-muted-foreground">All brand profiles under AI visibility analysis</p>
        </div>
        <Button asChild>
          <Link to="/profiles/new">
            <Plus className="h-4 w-4" />
            Create Profile
          </Link>
        </Button>
      </div>

      {isLoading &&
        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}

      {!isLoading && data?.length === 0 && (
        <EmptyState
          title="No profiles yet"
          description="Create your first profile to start AI visibility analysis."
          action={
            <Button asChild>
              <Link to="/profiles/new">Create Profile</Link>
            </Button>
          }
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((profile) => (
          <Link key={profile.id} to={`/profiles/${profile.id}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="font-semibold">{profile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.domain} · {profile.industry}
                  </p>
                  <p className="mt-2 text-sm">
                    Avg opportunity: <span className="font-medium">{profile.avg_opportunity}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Model: {profile.preferred_model} · Created {formatDate(profile.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={profile.run_status} />
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
