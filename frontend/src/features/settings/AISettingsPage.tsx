import { CheckCircle2, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AIProviderStatusBadge, AIProviderStatusBanner } from '@/components/common/AIProviderStatusBanner'
import { ErrorState } from '@/components/common/ErrorState'
import { useToast } from '@/components/common/Toaster'
import { ProviderCredentialCard } from '@/features/settings/components/ProviderCredentialCard'
import { useAIConfig, useValidateAIConfig } from '@/features/settings/hooks/useAIConfig'

export function AISettingsPage() {
  const { data, isLoading, isError, refetch } = useAIConfig()
  const validate = useValidateAIConfig()
  const { toast } = useToast()

  const credentialProviders = data?.providers.filter((p) => p.requires_api_key) ?? []
  const hasAnyConfigured = credentialProviders.some((p) => p.configured)

  const handleValidate = async () => {
    try {
      const result = await validate.mutateAsync()
      if (result.summary.any_live_provider) {
        toast({
          title: 'Validation successful',
          description: `${result.summary.connected_providers.length} provider(s) connected.`,
        })
      } else {
        toast({
          title: 'No live providers',
          description: 'Add at least one API key to enable real AI analysis.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({ title: 'Validation error', description: 'Could not reach the server.', variant: 'destructive' })
    }
  }

  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Configuration</h1>
          <p className="text-muted-foreground">
            Connect OpenAI, Claude, Gemini, or other providers for live pipeline analysis
          </p>
        </div>
        {hasAnyConfigured && (
          <Button variant="outline" onClick={handleValidate} disabled={validate.isPending}>
            {validate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Re-validate all
          </Button>
        )}
      </div>

      {isLoading ? <Skeleton className="h-32 rounded-xl" /> : data && <AIProviderStatusBanner summary={data.summary} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider API keys</CardTitle>
          <CardDescription>
            Keys are encrypted before storage and validated live before saving
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
          {credentialProviders.map((provider) => (
            <ProviderCredentialCard key={provider.id} provider={provider} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              All API keys are encrypted at rest on the server
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Full keys are never shown after saving — only masked hints
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Each provider is validated with its official API before storage
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.providers.map((provider) => (
            <div key={provider.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div>
                <p className="font-medium">{provider.name}</p>
                {!provider.requires_api_key && (
                  <p className="text-xs text-muted-foreground">{provider.message}</p>
                )}
              </div>
              <AIProviderStatusBadge status={provider.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
