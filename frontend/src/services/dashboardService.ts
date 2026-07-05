import api from './api'
import type { ApiResponse, DashboardData, ChartBucket } from '@/types'

export const dashboardService = {
  async getDashboard(): Promise<DashboardData> {
    const { data } = await api.get<ApiResponse<DashboardData>>('/dashboard')
    return data.data
  },

  async getOpportunityChart(): Promise<ChartBucket[]> {
    const { data } = await api.get<ApiResponse<ChartBucket[]>>('/charts/opportunity')
    return data.data
  },
}
