import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { configService } from '@/services/configService'
import type { SaveCredentialInput } from '@/types'

function invalidateConfig(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['ai-config'] })
  queryClient.invalidateQueries({ queryKey: ['models'] })
}

export function useAIConfig() {
  return useQuery({
    queryKey: ['ai-config'],
    queryFn: () => configService.getAIConfig(),
    staleTime: 30_000,
  })
}

export function useValidateAIConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => configService.validateAIConfig(),
    onSuccess: (data) => {
      queryClient.setQueryData(['ai-config'], data)
      invalidateConfig(queryClient)
    },
  })
}

export function useSaveCredential() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveCredentialInput) => configService.saveCredential(input),
    onSuccess: (data) => {
      queryClient.setQueryData(['ai-config'], data)
      invalidateConfig(queryClient)
    },
  })
}

export function useRemoveCredential() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (provider: string) => configService.removeCredential(provider),
    onSuccess: (data) => {
      queryClient.setQueryData(['ai-config'], data)
      invalidateConfig(queryClient)
    },
  })
}
