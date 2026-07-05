import { useQuery } from '@tanstack/react-query'
import { aiModelService } from '@/services/aiModelService'

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: () => aiModelService.getModels(),
    staleTime: 60_000,
  })
}
