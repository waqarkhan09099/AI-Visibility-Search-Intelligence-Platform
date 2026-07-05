import { useQuery } from '@tanstack/react-query'
import { chartService } from '@/services/chartService'
import { pipelineService } from '@/services/pipelineService'

export function useProfileCharts(profileId: number) {
  const opportunity = useQuery({
    queryKey: ['charts', 'opportunity', profileId],
    queryFn: () => chartService.getOpportunityChart(profileId),
    enabled: !!profileId,
  })

  const scatter = useQuery({
    queryKey: ['charts', 'scatter', profileId],
    queryFn: () => chartService.getScatterChart(profileId),
    enabled: !!profileId,
  })

  const trend = useQuery({
    queryKey: ['charts', 'pipeline-trend', profileId],
    queryFn: () => pipelineService.getPipelineTrend(profileId),
    enabled: !!profileId,
  })

  return { opportunity, scatter, trend }
}
