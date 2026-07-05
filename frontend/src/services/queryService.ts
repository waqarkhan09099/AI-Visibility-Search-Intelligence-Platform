import api from './api'
import type { ApiResponse, QueriesResponse, Query, QueryFilters } from '@/types'

export const queryService = {
  async getQueries(profileId: number, filters: QueryFilters = {}): Promise<QueriesResponse> {
    const { data } = await api.get<ApiResponse<QueriesResponse>>(`/profiles/${profileId}/queries`, {
      params: filters,
    })
    return data.data
  },

  async recheckQuery(profileId: number, queryId: number): Promise<Query> {
    const { data } = await api.post<ApiResponse<Query>>(
      `/profiles/${profileId}/queries/${queryId}/recheck`,
    )
    return data.data
  },
}
