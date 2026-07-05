import { Bot, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { aiModelService } from '@/services/aiModelService'
import { useModels } from '@/features/pipeline/hooks/useModels'
import type { AIModel } from '@/types'

const STAGE_LABELS: Record<string, string> = {
  initializing: 'Initializing pipeline',
  generating_queries: 'Generating AI search queries',
  scoring_queries: 'Scoring query opportunities',
  generating_recommendations: 'Generating recommendations',
  completed: 'Completed',
  failed: 'Failed',
}

const PROVIDER_HINTS: Record<string, string> = {
  openai: 'OpenAI API key required',
  anthropic: 'Anthropic API key required',
  google: 'Google API key required',
}

interface ModelSelectorProps {
  value: string
  onChange: (model: AIModel) => void
  disabled?: boolean
  id?: string
}

function ModelOption({ model }: { model: AIModel }) {
  return (
    <span className="flex flex-col gap-0.5 py-0.5">
      <span className="flex items-center gap-1.5 font-medium leading-none">
        {model.name}
        {!model.available && <Lock className="h-3 w-3 text-muted-foreground" />}
      </span>
      <span className="text-xs leading-snug text-muted-foreground">{model.description}</span>
    </span>
  )
}

export function ModelSelector({ value, onChange, disabled, id = 'ai-model' }: ModelSelectorProps) {
  const { data, isLoading } = useModels()

  if (isLoading) return <Skeleton className="h-10 w-full" />

  const models = data?.models ?? []
  const status = data?.status
  const groups = aiModelService.getProviderGroups(models)
  const selectedId =
    value ||
    (status ? aiModelService.pickDefaultModel(models, status)?.id : undefined) ||
    models.find((m) => m.available)?.id ||
    ''
  const selectedModel = models.find((m) => m.id === selectedId)

  return (
    <div className="relative isolate z-50 w-full space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
        <Bot className="h-4 w-4" />
        AI Model
      </Label>

      <Select
        value={selectedId}
        onValueChange={(modelId) => {
          const model = models.find((m) => m.id === modelId)
          if (model) onChange(model)
        }}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full bg-background">
          <SelectValue placeholder="Select AI model">
            {selectedModel ? `${selectedModel.name}` : 'Select AI model'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" side="bottom" align="start">
          {groups.map((group, index) => (
            <div key={group.provider}>
              {index > 0 && <SelectSeparator />}
              <SelectGroup>
                <SelectLabel>
                  {group.label}
                  {group.provider !== 'mock' &&
                    !group.models.some((m) => m.available) &&
                    ` (${PROVIDER_HINTS[group.provider] ?? 'API key required'})`}
                </SelectLabel>
                {group.models.map((m) => (
                  <SelectItem key={m.id} value={m.id} disabled={!m.available}>
                    <ModelOption model={m} />
                  </SelectItem>
                ))}
              </SelectGroup>
            </div>
          ))}
        </SelectContent>
      </Select>

      {selectedModel && (
        <p className="text-xs text-muted-foreground">
          Provider: <span className="font-medium capitalize">{selectedModel.provider}</span>
          {!selectedModel.available && (
            <>
              {' · '}
              <Link to="/settings/ai" className="text-primary hover:underline">
                Configure API key
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  )
}

export function PipelineStageLabel({ stage }: { stage: string | null | undefined }) {
  if (!stage) return null
  return (
    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
      {STAGE_LABELS[stage] ?? stage}
    </span>
  )
}

export { STAGE_LABELS }
