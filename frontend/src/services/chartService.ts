import api from './api'
import type { ApiResponse, ChartBucket, ScatterPoint } from '@/types'

export const chartService = {
  async getOpportunityChart(profileId: number): Promise<ChartBucket[]> {
    const { data } = await api.get<ApiResponse<ChartBucket[]>>(
      `/profiles/${profileId}/charts/opportunity`,
    )
    return data.data
  },

  async getScatterChart(profileId: number): Promise<ScatterPoint[]> {
    const { data } = await api.get<ApiResponse<ScatterPoint[]>>(
      `/profiles/${profileId}/charts/scatter`,
    )
    return data.data
  },
}
