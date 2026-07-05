import { useQuery } from '@tanstack/react-query'
import { recommendationService } from '@/services/recommendationService'

export function useRecommendations(profileId: number) {
  return useQuery({
    queryKey: ['recommendations', profileId],
    queryFn: () => recommendationService.getRecommendations(profileId),
    enabled: !!profileId,
  })
}
