import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ExternalLink, Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AIProviderStatusBanner } from '@/components/common/AIProviderStatusBanner'
import { ErrorState } from '@/components/common/ErrorState'
import { ModelSelector, PipelineStageLabel } from '@/components/common/ModelSelector'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useToast } from '@/components/common/Toaster'
import { OpportunityChart } from '@/components/charts/OpportunityChart'
import { VolumeDifficultyChart } from '@/components/charts/ScatterChart'
import { PipelineTrendChart } from '@/components/charts/PipelineTrendChart'
import { useProfile } from '@/features/profiles/hooks/useProfiles'
import { useUpdateProfileModel } from '@/features/profiles/hooks/useUpdateProfile'
import { useProfileCharts } from '@/features/profiles/hooks/useProfileCharts'
import { usePipelineStatus, useRunPipeline } from '@/features/pipeline/hooks/usePipeline'
import { useAIConfig } from '@/features/settings/hooks/useAIConfig'
import { QueriesTab } from '@/features/queries/QueriesTab'
import { RecommendationsTab } from '@/features/recommendations/RecommendationsTab'
import { PipelineHistoryTab } from '@/features/pipeline/PipelineHistoryTab'
import { formatDate } from '@/utils/cn'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/services/api'
import type { AIModel } from '@/types'

export function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>()
  const profileId = Number(id)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: profile, isLoading, isError, refetch } = useProfile(profileId)
  const isRunning = profile?.run_status === 'running'
  const { data: pipelineStatus } = usePipelineStatus(profileId, isRunning)
  const runPipeline = useRunPipeline(profileId)
  const updateModel = useUpdateProfileModel(profileId)
  const charts = useProfileCharts(profileId)
  const aiConfig = useAIConfig()

  const [selectedModel, setSelectedModel] = useState('')

  useEffect(() => {
    if (profile?.preferred_model) setSelectedModel(profile.preferred_model)
  }, [profile?.preferred_model])

  useEffect(() => {
    if (pipelineStatus?.status === 'completed' && isRunning) {
      queryClient.invalidateQueries({ queryKey: ['profiles', profileId] })
      queryClient.invalidateQueries({ queryKey: ['queries', profileId] })
      queryClient.invalidateQueries({ queryKey: ['recommendations', profileId] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-runs', profileId] })
      queryClient.invalidateQueries({ queryKey: ['charts', profileId] })
      toast({ title: 'Pipeline completed', description: 'AI analysis finished successfully.' })
    }
    if (pipelineStatus?.status === 'failed' && isRunning) {
      queryClient.invalidateQueries({ queryKey: ['profiles', profileId] })
      toast({
        title: 'Pipeline failed',
        description: pipelineStatus.error_message ?? 'An error occurred during analysis.',
        variant: 'destructive',
      })
    }
  }, [pipelineStatus?.status, isRunning, profileId, queryClient, toast, pipelineStatus?.error_message])

  const handleModelChange = async (model: AIModel) => {
    setSelectedModel(model.id)
    try {
      await updateModel.mutateAsync({ preferred_model: model.id, preferred_provider: model.provider })
    } catch {
      toast({ title: 'Failed to save model preference', variant: 'destructive' })
    }
  }

  const handleRunPipeline = async () => {
    try {
      await runPipeline.mutateAsync({ model_id: selectedModel || profile?.preferred_model })
      toast({ title: 'Pipeline started', description: 'AI is analyzing visibility opportunities...' })
      refetch()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to start pipeline'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    }
  }

  if (isError) return <ErrorState onRetry={() => refetch()} />

  if (isLoading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  const pipelineRunning = isRunning || runPipeline.isPending

  return (
    <div className="space-y-6">
      {/* Profile metadata */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
        <a
          href={`https://${profile.domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {profile.domain}
          <ExternalLink className="h-3 w-3" />
        </a>
        <p className="mt-1 text-muted-foreground">{profile.industry}</p>
        {profile.description && <p className="mt-2 max-w-3xl text-sm">{profile.description}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.competitors.map((c) => (
            <Badge key={c} variant="outline">
              {c}
            </Badge>
          ))}
        </div>
      </div>

      {/* Stats — full width row, no overlap with controls */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Queries', value: profile.stats.total_queries },
          { label: 'Avg Opportunity', value: profile.stats.avg_opportunity },
          { label: 'Last Run', value: formatDate(profile.stats.last_run_at) },
          { label: 'Tokens Used', value: profile.stats.tokens_used.toLocaleString() },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI pipeline controls */}
      <Card className="overflow-visible">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">AI Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 overflow-visible">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative z-50 w-full sm:max-w-sm">
              <ModelSelector
                value={selectedModel}
                onChange={handleModelChange}
                disabled={pipelineRunning}
              />
            </div>
            <Button
              onClick={handleRunPipeline}
              disabled={pipelineRunning}
              className="w-full shrink-0 sm:w-auto"
            >
              {pipelineRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {pipelineRunning ? 'Running Pipeline...' : 'Run AI Pipeline'}
            </Button>
          </div>

          {!aiConfig.isLoading && aiConfig.data && (
            <AIProviderStatusBanner summary={aiConfig.data.summary} compact />
          )}
        </CardContent>
      </Card>

      {pipelineRunning && pipelineStatus && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">AI pipeline in progress</p>
                <PipelineStageLabel stage={pipelineStatus.stage} />
              </div>
              <p className="text-sm text-muted-foreground">
                Model: {pipelineStatus.model_id} · {pipelineStatus.queries_scored} queries scored ·{' '}
                {pipelineStatus.tokens_used.toLocaleString()} tokens · {pipelineStatus.progress_pct}%
              </p>
            </div>
            <StatusBadge status="running" />
          </CardContent>
        </Card>
      )}

      {profile.run_status === 'failed' && pipelineStatus?.error_message && (
        <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="p-4 text-sm text-red-700 dark:text-red-300">
            Last pipeline failed: {pipelineStatus.error_message}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="queries">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="queries">Queries</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline Runs</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>
        <TabsContent value="queries" className="mt-4">
          <QueriesTab profileId={profileId} />
        </TabsContent>
        <TabsContent value="recommendations" className="mt-4">
          <RecommendationsTab profileId={profileId} />
        </TabsContent>
        <TabsContent value="pipeline" className="mt-4">
          <PipelineHistoryTab profileId={profileId} />
        </TabsContent>
        <TabsContent value="charts" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <OpportunityChart data={charts.opportunity.data} loading={charts.opportunity.isLoading} />
            <VolumeDifficultyChart data={charts.scatter.data} loading={charts.scatter.isLoading} />
            <div className="lg:col-span-2">
              <PipelineTrendChart data={charts.trend.data} loading={charts.trend.isLoading} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
