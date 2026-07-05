import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryService } from '@/services/queryService'
import type { QueryFilters, QueriesResponse } from '@/types'

export function useQueries(profileId: number, filters: QueryFilters) {
  return useQuery({
    queryKey: ['queries', profileId, filters],
    queryFn: () => queryService.getQueries(profileId, filters),
    enabled: !!profileId,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      const polling = items.some((q) => q.status === 'rechecking' || q.status === 'scoring')
      return polling ? 2000 : false
    },
  })
}

export function useRecheckQuery(profileId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (queryId: number) => queryService.recheckQuery(profileId, queryId),
    onMutate: async (queryId) => {
      await queryClient.cancelQueries({ queryKey: ['queries', profileId] })
      const previous = queryClient.getQueriesData<QueriesResponse>({ queryKey: ['queries', profileId] })
      queryClient.setQueriesData<QueriesResponse>(
        { queryKey: ['queries', profileId] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((q) => (q.id === queryId ? { ...q, status: 'rechecking' as const } : q)),
          }
        },
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      context?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['queries', profileId] })
      queryClient.invalidateQueries({ queryKey: ['profiles', profileId] })
    },
  })
}
