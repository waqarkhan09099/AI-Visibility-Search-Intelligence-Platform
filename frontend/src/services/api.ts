import axios, { type AxiosError } from 'axios'
import type { ApiErrorResponse } from '@/types'

export class ApiError extends Error {
  details?: Record<string, string[]>
  status?: number

  constructor(message: string, details?: Record<string, string[]>, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.details = details
    this.status = status
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const data = error.response?.data
    throw new ApiError(
      data?.error || error.message || 'Request failed',
      data?.details,
      error.response?.status,
    )
  },
)

export default api
