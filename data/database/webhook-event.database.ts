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

