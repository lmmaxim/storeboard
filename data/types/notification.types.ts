export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string | null
  read: boolean
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface NotificationInsert {
  user_id: string
  type: string
  title: string
  message?: string | null
  read?: boolean
  metadata?: Record<string, unknown> | null
  created_at?: string
}

export interface NotificationUpdate {
  type?: string
  title?: string
  message?: string | null
  read?: boolean
  metadata?: Record<string, unknown> | null
}

