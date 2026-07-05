import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { profileService } from '@/services/profileService'
import type { CreateProfileInput } from '@/types'

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: () => profileService.getProfiles(),
  })
}

export function useProfile(id: number) {
  return useQuery({
    queryKey: ['profiles', id],
    queryFn: () => profileService.getProfile(id),
    enabled: !!id,
  })
}

export function useCreateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProfileInput) => profileService.createProfile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
