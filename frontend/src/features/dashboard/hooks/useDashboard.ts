import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboardService'
import type { DashboardFilters } from '@/types'

export function useDashboard(filters: DashboardFilters = {}) {
  return useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => dashboardService.getDashboard(filters),
  })
}

export function useOpportunityChart() {
  return useQuery({
    queryKey: ['charts', 'opportunity'],
    queryFn: () => dashboardService.getOpportunityChart(),
  })
}
