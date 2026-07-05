import { useMutation, useQueryClient } from '@tanstack/react-query'
import { profileService } from '@/services/profileService'

export function useUpdateProfileModel(profileId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { preferred_model: string; preferred_provider: string }) =>
      profileService.updateProfile(profileId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', profileId] })
    },
  })
}
