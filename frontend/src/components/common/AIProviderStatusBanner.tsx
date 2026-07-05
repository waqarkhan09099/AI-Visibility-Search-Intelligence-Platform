import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Info,
  KeyRound,
  Settings,
  WifiOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/utils/cn'
import type { AIConfigSummary, AIProviderValidationStatus } from '@/types'

const STATUS_META: Record<
  AIProviderValidationStatus,
  { label: string; icon: typeof CheckCircle2; tone: 'success' | 'warning' | 'error' | 'info' }
> = {
  valid: { label: 'Connected', icon: CheckCircle2, tone: 'success' },
  missing: { label: 'Not configured', icon: KeyRound, tone: 'warning' },
  invalid_format: { label: 'Invalid format', icon: AlertCircle, tone: 'error' },
  invalid_credentials: { label: 'Invalid key', icon: AlertCircle, tone: 'error' },
  network_error: { label: 'Connection error', icon: WifiOff, tone: 'error' },
  mock: { label: 'Mock mode', icon: Info, tone: 'info' },
}

const TONE_STYLES = {
  success:
    'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  warning:
    'border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
  error: 'border-red-200 bg-red-50/80 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100',
  info: 'border-blue-200 bg-blue-50/80 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100',
}

interface AIProviderStatusBannerProps {
  summary?: AIConfigSummary | null
  compact?: boolean
  className?: string
}

export function AIProviderStatusBanner({ summary, compact, className }: AIProviderStatusBannerProps) {
  if (!summary) return null

  const anyLive = summary.any_live_provider
  const tone = anyLive ? 'success' : 'warning'
  const meta = anyLive ? STATUS_META.valid : STATUS_META.missing
  const Icon = meta.icon

  if (compact && anyLive) return null

  const providerLabels: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Claude',
    google: 'Gemini',
  }
  const connectedLabel = summary.connected_providers
    .map((p) => providerLabels[p] ?? p)
    .join(', ')

  return (
    <Card className={cn('overflow-hidden', TONE_STYLES[tone], className)}>
      <CardContent className={cn('flex gap-4', compact ? 'p-4' : 'p-5')}>
        <div className="mt-0.5 shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-semibold">{anyLive ? 'Live AI connected' : 'Mock mode active'}</p>
          <p className="text-sm leading-relaxed opacity-90">
            {anyLive
              ? `Connected: ${connectedLabel}. Select any enabled model when running the pipeline.`
              : 'Add an API key for OpenAI, Claude, or Gemini in AI Configuration to enable live analysis.'}
          </p>
          {!anyLive && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" asChild className="bg-background/60">
                <Link to="/settings/ai">
                  <Settings className="h-3.5 w-3.5" />
                  Add API key
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                  Provider docs
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function AIProviderStatusBadge({ status }: { status: AIProviderValidationStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONE_STYLES[meta.tone],
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  )
}
