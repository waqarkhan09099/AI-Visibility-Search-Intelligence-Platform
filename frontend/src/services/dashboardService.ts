import api from './api'
import type { ApiResponse, ChartBucket, DashboardData, DashboardFilters } from '@/types'

export const dashboardService = {
  async getDashboard(filters: DashboardFilters = {}): Promise<DashboardData> {
    const { data } = await api.get<ApiResponse<DashboardData>>('/dashboard', { params: filters })
    return data.data
  },

  async getOpportunityChart(): Promise<ChartBucket[]> {
    const { data } = await api.get<ApiResponse<ChartBucket[]>>('/charts/opportunity')
    return data.data
  },
}
