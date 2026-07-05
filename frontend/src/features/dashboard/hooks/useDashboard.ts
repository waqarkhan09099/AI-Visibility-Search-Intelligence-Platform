import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboardService'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardService.getDashboard(),
  })
}

export function useOpportunityChart() {
  return useQuery({
    queryKey: ['charts', 'opportunity'],
    queryFn: () => dashboardService.getOpportunityChart(),
  })
}
