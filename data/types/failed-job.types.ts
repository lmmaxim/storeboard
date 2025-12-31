export interface FailedJob {
  id: string
  type: string
  payload: Record<string, unknown>
  error: string
  retry_count: number
  created_at: string
  last_attempted_at: string | null
}

export interface FailedJobInsert {
  type: string
  payload: Record<string, unknown>
  error: string
  retry_count?: number
  last_attempted_at?: string | null
  created_at?: string
}

export interface FailedJobUpdate {
  payload?: Record<string, unknown>
  error?: string
  retry_count?: number
  last_attempted_at?: string | null
}

