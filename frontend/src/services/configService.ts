import api from './api'
import type { AIConfigResponse, ApiResponse, SaveCredentialInput } from '@/types'

export const configService = {
  async getAIConfig(): Promise<AIConfigResponse> {
    const { data } = await api.get<ApiResponse<AIConfigResponse>>('/config/ai')
    return data.data
  },

  async validateAIConfig(): Promise<AIConfigResponse> {
    const { data } = await api.post<ApiResponse<AIConfigResponse>>('/config/ai/validate')
    return data.data
  },

  async saveCredential(input: SaveCredentialInput): Promise<AIConfigResponse> {
    const { data } = await api.post<ApiResponse<AIConfigResponse>>('/config/ai/credentials', input)
    return data.data
  },

  async removeCredential(provider: string): Promise<AIConfigResponse> {
    const { data } = await api.delete<ApiResponse<AIConfigResponse>>(`/config/ai/credentials/${provider}`)
    return data.data
  },
}
