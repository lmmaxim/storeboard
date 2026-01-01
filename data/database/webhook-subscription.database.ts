import { getSupabaseServiceClient } from '@/data/database/client'

const TABLE = 'shopify_webhook_subscriptions'

export interface WebhookSubscription {
  id: string
  store_id: string
  shopify_webhook_id: string
  topic: string
  webhook_url: string
  created_at: string
}

export interface WebhookSubscriptionInsert {
  store_id: string
  shopify_webhook_id: string
  topic: string
  webhook_url: string
}

function normalizeSubscription(record: unknown): WebhookSubscription {
  if (!record) {
    throw new Error('Webhook subscription record is missing')
  }

  return record as WebhookSubscription
}

export async function createWebhookSubscription(
  payload: WebhookSubscriptionInsert
): Promise<WebhookSubscription> {
  const supabase = getSupabaseServiceClient()

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create webhook subscription: ${error.message}`)
  }

  return normalizeSubscription(data)
}

export async function getWebhookSubscriptionsByStore(
  storeId: string
): Promise<WebhookSubscription[]> {
  const supabase = getSupabaseServiceClient()

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(normalizeSubscription)
}

export async function deleteWebhookSubscription(
  subscriptionId: string
): Promise<void> {
  const supabase = getSupabaseServiceClient()

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', subscriptionId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteWebhookSubscriptionsByStore(
  storeId: string
): Promise<void> {
  const supabase = getSupabaseServiceClient()

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('store_id', storeId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getWebhookSubscriptionByShopifyId(
  storeId: string,
  shopifyWebhookId: string
): Promise<WebhookSubscription | null> {
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

  return normalizeSubscription(data)
}

