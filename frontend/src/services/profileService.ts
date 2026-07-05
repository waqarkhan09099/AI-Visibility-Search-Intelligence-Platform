import api from './api'
import type { ApiResponse, CreateProfileInput, Profile, ProfileDetail } from '@/types'

export const profileService = {
  async getProfiles(): Promise<Profile[]> {
    const { data } = await api.get<ApiResponse<Profile[]>>('/profiles')
    return data.data
  },

  async getProfile(id: number): Promise<ProfileDetail> {
    const { data } = await api.get<ApiResponse<ProfileDetail>>(`/profiles/${id}`)
    return data.data
  },

  async createProfile(input: CreateProfileInput): Promise<Profile> {
    const { data } = await api.post<ApiResponse<Profile>>('/profiles', input)
    return data.data
  },

  async updateProfile(
    id: number,
    input: { preferred_model?: string; preferred_provider?: string },
  ): Promise<Profile> {
    const { data } = await api.patch<ApiResponse<Profile>>(`/profiles/${id}`, input)
    return data.data
  },
}
