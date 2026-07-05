import { useState } from 'react'
import { CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AIProviderStatusBadge } from '@/components/common/AIProviderStatusBanner'
import { useToast } from '@/components/common/Toaster'
import { useRemoveCredential, useSaveCredential } from '@/features/settings/hooks/useAIConfig'
import { ApiError } from '@/services/api'
import type { AIProviderConfigStatus, AIProviderId } from '@/types'

interface ProviderCredentialCardProps {
  provider: AIProviderConfigStatus
}

export function ProviderCredentialCard({ provider }: ProviderCredentialCardProps) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const saveCredential = useSaveCredential()
  const removeCredential = useRemoveCredential()
  const { toast } = useToast()

  const inputId = `${provider.id}-api-key`

  const handleSave = async () => {
    const trimmed = apiKey.trim()
    if (!trimmed) {
      toast({ title: 'API key required', description: `Enter your ${provider.name} API key.`, variant: 'destructive' })
      return
    }
    try {
      await saveCredential.mutateAsync({ provider: provider.id as AIProviderId, api_key: trimmed })
      setApiKey('')
      toast({ title: 'API key saved', description: `${provider.name} key verified and stored securely.` })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save API key'
      toast({ title: 'Save failed', description: message, variant: 'destructive' })
    }
  }

  const handleRemove = async () => {
    try {
      await removeCredential.mutateAsync(provider.id)
      toast({ title: 'API key removed', description: `${provider.name} credentials deleted.` })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not remove API key'
      toast({ title: 'Remove failed', description: message, variant: 'destructive' })
    }
  }

  return (
    <div className="rounded-lg border p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{provider.name}</h3>
            <AIProviderStatusBadge status={provider.status} />
          </div>
          <p className="text-sm text-muted-foreground">{provider.description}</p>
        </div>
        {provider.docs_url && (
          <Button variant="ghost" size="sm" asChild>
            <a href={provider.docs_url} target="_blank" rel="noopener noreferrer">
              Get API key
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </div>

      {provider.stored_in_app && provider.key_hint && (
        <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Saved key</p>
            <p className="font-mono text-sm">{provider.key_hint}</p>
          </div>
          {provider.valid && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified
            </span>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={inputId}>{provider.stored_in_app ? 'Replace API key' : 'API key'}</Label>
        <div className="relative">
          <Input
            id={inputId}
            type={showKey ? 'text' : 'password'}
            placeholder={provider.key_placeholder || 'Paste API key...'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="pr-10 font-mono"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-10 w-10"
            onClick={() => setShowKey((v) => !v)}
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{provider.message}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={saveCredential.isPending || !apiKey.trim()} size="sm">
          {saveCredential.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Save & verify
        </Button>
        {provider.stored_in_app && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={removeCredential.isPending}
            className="text-destructive hover:text-destructive"
          >
            {removeCredential.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Remove
          </Button>
        )}
      </div>

      {provider.valid && provider.models_count > 0 && (
        <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {provider.models_count} models available
        </p>
      )}
    </div>
  )
}
