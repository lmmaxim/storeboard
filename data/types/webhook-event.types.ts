export interface WebhookEvent {
  id: string
  store_id: string
  topic: string
  shopify_webhook_id: string | null
  payload: Record<string, unknown>
  processed: boolean
  error: string | null
  retry_count: number
  created_at: string
  processed_at: string | null
}

export interface WebhookEventInsert {
  store_id: string
  topic: string
  payload: Record<string, unknown>
  shopify_webhook_id?: string | null
  processed?: boolean
  error?: string | null
  retry_count?: number
  processed_at?: string | null
}

export interface WebhookEventUpdate {
  processed?: boolean
  error?: string | null
  retry_count?: number
  processed_at?: string | null
}

