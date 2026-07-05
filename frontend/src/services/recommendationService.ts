import api from './api'
import type { ApiResponse, GroupedRecommendations } from '@/types'

export const recommendationService = {
  async getRecommendations(profileId: number): Promise<GroupedRecommendations> {
    const { data } = await api.get<ApiResponse<GroupedRecommendations>>(
      `/profiles/${profileId}/recommendations`,
    )
    return data.data
  },
}
