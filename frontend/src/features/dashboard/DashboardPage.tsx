import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AIProviderStatusBanner } from '@/components/common/AIProviderStatusBanner'
import { ErrorState } from '@/components/common/ErrorState'
import { RecentMentionsTable } from '@/features/dashboard/components/RecentMentionsTable'
import { ShareOfVoiceChart } from '@/features/dashboard/components/ShareOfVoiceChart'
import { VisibilityScoreCard } from '@/features/dashboard/components/VisibilityScoreCard'
import { VisibilityStatsBar } from '@/features/dashboard/components/VisibilityStatsBar'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { useAIConfig } from '@/features/settings/hooks/useAIConfig'

const ENGINE_OPTIONS = [
  { value: 'all', label: 'All Engines' },
  { value: 'chatgpt', label: 'ChatGPT 5.2' },
  { value: 'google', label: 'Google AI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'perplexity', label: 'Perplexity' },
]

export function DashboardPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [engine, setEngine] = useState('all')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError, refetch, isFetching } = useDashboard({
    page,
    limit: 4,
    search: debouncedSearch,
    engine,
  })
  const aiConfig = useAIConfig()

  if (isError) return <ErrorState onRetry={() => refetch()} />

  const loading = isLoading || isFetching

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Search Visibility</h1>
          <p className="mt-1 text-muted-foreground">Track your brand&apos;s presence in AI-generated answers</p>
        </div>
        <div className="w-full sm:w-56">
          <Label htmlFor="ai-engine" className="mb-2 block text-xs text-muted-foreground">
            AI Engine
          </Label>
          <Select
            value={engine}
            onValueChange={(value) => {
              setEngine(value)
              setPage(1)
            }}
          >
            <SelectTrigger id="ai-engine">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENGINE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!aiConfig.isLoading && aiConfig.data && (
        <AIProviderStatusBanner summary={aiConfig.data.summary} compact />
      )}

      <VisibilityStatsBar stats={data?.stats} loading={loading && !data} />

      <RecentMentionsTable
        mentions={data?.mentions}
        loading={loading && !data}
        search={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
        onPageChange={setPage}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <VisibilityScoreCard visibility={data?.visibility} loading={loading && !data} />
        <ShareOfVoiceChart data={data?.share_of_voice} loading={loading && !data} />
      </div>

      {loading && !data && <Skeleton className="h-8 w-40" />}
    </div>
  )
}
