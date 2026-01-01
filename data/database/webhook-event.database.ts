import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
} from '@/data/database/client'
import type {
  WebhookEvent,
  WebhookEventInsert,
  WebhookEventUpdate,
} from '@/data/types/webhook-event.types'

const TABLE = 'webhook_events'

function normalizeWebhook(record: unknown): WebhookEvent {
  if (!record) {
    throw new Error('Webhook event record is missing')
  }

  return record as WebhookEvent
}

export async function insertWebhookEvent(
  payload: WebhookEventInsert
): Promise<WebhookEvent> {
  const supabase = getSupabaseServiceClient()

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeWebhook(data)
}

export async function updateWebhookEvent(
  eventId: string,
  updates: WebhookEventUpdate
): Promise<WebhookEvent> {
  const supabase = getSupabaseServiceClient()

  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeWebhook(data)
}

export async function getWebhookEventsForStore(
  storeId: string,
  userId: string
): Promise<WebhookEvent[]> {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from(TABLE)
    .select('*, stores!inner(user_id)')
    .eq('store_id', storeId)
    .eq('stores.user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((record) =>
    normalizeWebhook(record)
  ) as WebhookEvent[]
}

export async function createWebhookEvent(
  payload: WebhookEventInsert
): Promise<WebhookEvent> {
  return insertWebhookEvent(payload)
}

export async function getEventByShopifyId(
  storeId: string,
  shopifyWebhookId: string
): Promise<WebhookEvent | null> {
  const supabase = getSupabaseServiceClient()

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('store_id', storeId)
    .eq('shopify_webhook_id', shopifyWebhookId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  return normalizeWebhook(data)
}

export async function markEventProcessed(
  eventId: string
): Promise<WebhookEvent> {
  return updateWebhookEvent(eventId, {
    processed: true,
    processed_at: new Date().toISOString(),
  })
}

export async function markEventFailed(
  eventId: string,
  error: string
): Promise<WebhookEvent> {
  const supabase = getSupabaseServiceClient()

  // Get current retry count
  const { data: current } = await supabase
    .from(TABLE)
    .select('retry_count')
    .eq('id', eventId)
    .single()

  const retryCount = (current?.retry_count ?? 0) + 1

  return updateWebhookEvent(eventId, {
    processed: false,
    error,
    retry_count: retryCount,
  })
}

