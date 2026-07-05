import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { pipelineService } from '@/services/pipelineService'
import { aiModelService } from '@/services/aiModelService'

export function usePipelineStatus(profileId: number, polling: boolean) {
  return useQuery({
    queryKey: ['pipeline-status', profileId],
    queryFn: () => pipelineService.getPipelineStatus(profileId),
    enabled: !!profileId,
    refetchInterval: polling ? 2000 : false,
  })
}

export function usePipelineRuns(profileId: number) {
  return useQuery({
    queryKey: ['pipeline-runs', profileId],
    queryFn: () => pipelineService.getPipelineRuns(profileId),
    enabled: !!profileId,
  })
}

export function useRunPipeline(profileId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input?: { model_id?: string }) => {
      const catalog = await aiModelService.getModels()
      return pipelineService.runPipeline(profileId, input ?? {}, {
        models: catalog.models,
        status: catalog.status,
        strictModel: Boolean(input?.model_id),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-status', profileId] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-runs', profileId] })
      queryClient.invalidateQueries({ queryKey: ['profiles', profileId] })
    },
  })
}
