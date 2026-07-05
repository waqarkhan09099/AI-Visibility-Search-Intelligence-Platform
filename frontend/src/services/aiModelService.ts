import api from './api'
import type { AIModel, AIStatus, ApiResponse, ModelsResponse, RunPipelineInput } from '@/types'

export class ModelValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModelValidationError'
  }
}

const LIVE_PROVIDERS = ['openai', 'anthropic', 'google'] as const

export const aiModelService = {
  async getModels(): Promise<ModelsResponse> {
    const { data } = await api.get<ApiResponse<ModelsResponse>>('/models')
    return data.data
  },

  async getAIStatus(): Promise<AIStatus> {
    const catalog = await this.getModels()
    return catalog.status
  },

  getAvailableModels(models: AIModel[]): AIModel[] {
    return models.filter((m) => m.available)
  },

  getModelsByProvider(models: AIModel[], provider: string): AIModel[] {
    return models.filter((m) => m.provider === provider)
  },

  getProviderGroups(models: AIModel[]): { provider: string; label: string; models: AIModel[] }[] {
    const labels: Record<string, string> = {
      openai: 'OpenAI',
      anthropic: 'Anthropic (Claude)',
      google: 'Google (Gemini)',
      mock: 'Mock (local dev)',
    }
    const order = [...LIVE_PROVIDERS, 'mock']
    return order
      .map((provider) => ({
        provider,
        label: labels[provider] ?? provider,
        models: this.getModelsByProvider(models, provider),
      }))
      .filter((g) => g.models.length > 0)
  },

  findModel(models: AIModel[], modelId: string): AIModel | undefined {
    return models.find((m) => m.id === modelId)
  },

  pickDefaultModel(models: AIModel[], status: AIStatus): AIModel | undefined {
    const available = models.filter((m) => m.available)
    if (!available.length) return undefined

    if (status.any_live_provider) {
      const preferred = available.find((m) => m.id === status.default_model)
      if (preferred) return preferred
      for (const provider of LIVE_PROVIDERS) {
        const match = available.find((m) => m.provider === provider)
        if (match) return match
      }
    }
    return available.find((m) => m.provider === 'mock')
  },

  resolveForPipeline(
    models: AIModel[],
    status: AIStatus,
    preferredModel?: string | null,
  ): { modelId: string; provider: string } {
    const requested = preferredModel || status.default_model
    const match = this.findModel(models, requested)

    if (match?.provider === 'mock') {
      return { modelId: match.available ? match.id : 'mock-fast', provider: 'mock' }
    }

    if (match?.available) {
      return { modelId: match.id, provider: match.provider }
    }

    for (const provider of LIVE_PROVIDERS) {
      const live = this.getModelsByProvider(models, provider).filter((m) => m.available)
      const resolved = live.find((m) => m.id === requested) ?? live[0]
      if (resolved) return { modelId: resolved.id, provider: resolved.provider }
    }

    const mock = this.getModelsByProvider(models, 'mock').find((m) => m.available)
    return { modelId: mock?.id ?? 'mock-fast', provider: 'mock' }
  },

  validateSelection(models: AIModel[], modelId: string): string {
    const model = this.findModel(models, modelId)
    if (!model) {
      throw new ModelValidationError(`Unknown model: ${modelId}`)
    }
    if (!model.available) {
      throw new ModelValidationError(
        `Configure your ${model.provider} API key in Settings → AI Configuration to use this model.`,
      )
    }
    return model.id
  },

  buildPipelineRunInput(
    models: AIModel[],
    status: AIStatus,
    preferredModel?: string | null,
    strict = false,
  ): RunPipelineInput {
    if (!preferredModel) {
      const resolved = this.resolveForPipeline(models, status)
      return { model_id: resolved.modelId }
    }
    const modelId = strict
      ? this.validateSelection(models, preferredModel)
      : this.resolveForPipeline(models, status, preferredModel).modelId
    return { model_id: modelId }
  },

  getModelLabel(models: AIModel[], modelId: string): string {
    return this.findModel(models, modelId)?.name ?? modelId
  },
}

export const modelService = aiModelService
