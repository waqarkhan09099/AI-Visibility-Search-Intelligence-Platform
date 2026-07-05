import api from './api'
import { aiModelService } from './aiModelService'
import type {
  AIModel,
  AIStatus,
  ApiResponse,
  PipelineRun,
  PipelineStatus,
  PipelineTrendPoint,
  RunPipelineInput,
} from '@/types'

export const pipelineService = {
  async runPipeline(
    profileId: number,
    input: RunPipelineInput = {},
    options?: { models?: AIModel[]; status?: AIStatus; strictModel?: boolean },
  ): Promise<PipelineRun> {
    let payload = input

    if (options?.models && options?.status) {
      payload = aiModelService.buildPipelineRunInput(
        options.models,
        options.status,
        input.model_id,
        options.strictModel ?? Boolean(input.model_id),
      )
    }

    const { data } = await api.post<ApiResponse<PipelineRun>>(
      `/profiles/${profileId}/pipeline/run`,
      payload,
    )
    return data.data
  },

  async getPipelineStatus(profileId: number): Promise<PipelineStatus> {
    const { data } = await api.get<ApiResponse<PipelineStatus>>(`/profiles/${profileId}/pipeline/status`)
    return data.data
  },

  async getPipelineRuns(profileId: number): Promise<PipelineRun[]> {
    const { data } = await api.get<ApiResponse<PipelineRun[]>>(`/profiles/${profileId}/pipeline/runs`)
    return data.data
  },

  async getPipelineTrend(profileId: number): Promise<PipelineTrendPoint[]> {
    const { data } = await api.get<ApiResponse<PipelineTrendPoint[]>>(
      `/profiles/${profileId}/charts/pipeline-trend`,
    )
    return data.data
  },
}
