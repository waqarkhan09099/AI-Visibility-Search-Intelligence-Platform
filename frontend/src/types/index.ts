export interface ApiResponse<T> {
  data: T
}

export interface ApiErrorResponse {
  error: string
  details?: Record<string, string[]>
}

export type RunStatus = 'idle' | 'running' | 'completed' | 'failed'
export type QueryStatus = 'pending' | 'scored' | 'rechecking' | 'scoring'
export type Priority = 'high' | 'medium' | 'low'
export type PipelineStage =
  | 'initializing'
  | 'generating_queries'
  | 'scoring_queries'
  | 'generating_recommendations'
  | 'completed'
  | 'failed'

export interface AIModel {
  id: string
  name: string
  provider: string
  description: string
  available: boolean
}

export interface AIStatus {
  connected_providers: string[]
  any_live_provider: boolean
  using_mock_fallback: boolean
  active_provider: string
  default_model: string
  default_provider: string
  mock_available: boolean
  openai_configured?: boolean
  openai_valid?: boolean
  openai_status?: AIProviderValidationStatus
  openai_message?: string
  openai_key_hint?: string | null
}

export interface ModelsResponse {
  models: AIModel[]
  status: AIStatus
}

export type AIProviderValidationStatus =
  | 'valid'
  | 'missing'
  | 'invalid_format'
  | 'invalid_credentials'
  | 'network_error'
  | 'mock'

export type AIProviderId = 'openai' | 'anthropic' | 'google'

export interface AIProviderConfigStatus {
  id: string
  name: string
  description: string
  status: AIProviderValidationStatus
  message: string
  configured: boolean
  valid: boolean
  key_hint: string | null
  stored_in_app: boolean
  models_count: number
  key_placeholder: string
  docs_url: string
  requires_api_key: boolean
}

export interface AIConfigSummary {
  connected_providers: string[]
  any_live_provider: boolean
  using_mock_fallback: boolean
  active_provider: string
  default_model: string
  default_provider: string
  mock_available: boolean
  openai_configured?: boolean
  openai_valid?: boolean
  openai_status?: AIProviderValidationStatus
  openai_message?: string
  openai_key_hint?: string | null
  openai_stored_in_app?: boolean
}

export interface AIConfigResponse {
  providers: AIProviderConfigStatus[]
  summary: AIConfigSummary
}

export interface SaveCredentialInput {
  provider: AIProviderId
  api_key: string
}

export interface Profile {
  id: number
  name: string
  domain: string
  industry: string
  description: string
  competitors: string[]
  run_status: RunStatus
  avg_opportunity: number
  preferred_model: string
  preferred_provider: string
  created_at: string
}

export interface ProfileStats {
  total_queries: number
  avg_opportunity: number
  last_run_at: string | null
  tokens_used: number
}

export interface ProfileDetail extends Profile {
  stats: ProfileStats
}

export interface Query {
  id: number
  query_text: string
  volume: number
  difficulty: number
  opportunity_score: number
  rationale: string | null
  status: QueryStatus
}

export interface QueriesResponse {
  items: Query[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface QueryFilters {
  min_score?: number
  status?: string
  page?: number
  limit?: number
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}

export interface Recommendation {
  id: number
  title: string
  content_type: string
  priority: Priority
  rationale: string
  keywords: string[]
}

export interface GroupedRecommendations {
  high: Recommendation[]
  medium: Recommendation[]
  low: Recommendation[]
}

export interface PipelineRun {
  id: number
  status: RunStatus
  stage: PipelineStage
  model_id: string
  provider: string
  error_message: string | null
  started_at: string
  completed_at: string | null
  queries_scored: number
  tokens_used: number
  progress_pct: number
}

export interface PipelineStatus {
  status: RunStatus | 'idle'
  stage: PipelineStage | null
  model_id: string | null
  provider: string | null
  error_message: string | null
  queries_scored: number
  tokens_used: number
  progress_pct: number
  run_id: number | null
}

export interface PipelineTrendPoint {
  run_id: number
  date: string | null
  tokens_used: number
  queries_scored: number
  model_id: string
}

export interface RunPipelineInput {
  model_id?: string
}

export interface RankedItem {
  name: string
  count: number
}

export interface VisibilityStats {
  total_mentions: number
  total_mentions_label: string
  ai_search_volume: number
  ai_search_volume_label: string
  total_impressions: number
  total_impressions_label: string
  top_source_domains: RankedItem[]
  top_brand_entities: RankedItem[]
}

export interface MentionRow {
  id: number
  profile_id: number
  profile_name: string
  query_text: string
  platform: string
  mentioned: boolean
  ai_search_vol: number
  sources: number
  snippet: string
  sov: number
  location: string
  last_checked: string | null
}

export interface MentionsPage {
  items: MentionRow[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface VisibilityBreakdownRow {
  query_text: string
  score: number
  source_volume: number
}

export interface VisibilitySummary {
  score: number
  trend_pct: number
  trend_label: string
  breakdown: VisibilityBreakdownRow[]
}

export interface ShareOfVoiceItem {
  name: string
  sov: number
  is_you: boolean
}

export interface DashboardData {
  total_profiles: number
  average_opportunity: number
  total_queries: number
  pipeline_status: string
  recent_profiles: Profile[]
  stats: VisibilityStats
  mentions: MentionsPage
  visibility: VisibilitySummary
  share_of_voice: ShareOfVoiceItem[]
}

export interface DashboardFilters {
  page?: number
  limit?: number
  search?: string
  engine?: string
}

export interface ChartBucket {
  range: string
  count: number
}

export interface ScatterPoint {
  volume: number
  difficulty: number
  query: string
  score: number
}

export interface CreateProfileInput {
  name: string
  domain: string
  industry: string
  description?: string
  competitors: string[]
  preferred_model?: string
}
