import { unregisterWebhooks } from '@/lib/integrations/shopify/webhook'
import { getStoreByIdServiceRole } from '@/data/database/store.database'
import {
  getWebhookSubscriptionsByStore,
  deleteWebhookSubscriptionsByStore,
} from '@/data/database/webhook-subscription.database'
import { decryptCredentials } from '@/data/encryption/credentials'

/**
 * Unregister all webhooks for a store and clean up subscriptions
 */
export async function unregisterAllWebhooksForStore(
  storeId: string
): Promise<void> {
  const store = await getStoreByIdServiceRole(storeId)
  if (!store) {
    throw new Error('Store not found')
  }

  if (!store.shopify_access_token_encrypted) {
    console.log(`Store ${storeId} has no access token, skipping webhook cleanup`)
    return
  }

  try {
    // Decrypt access token
    const tokenData = decryptCredentials<{ accessToken: string }>(
      store.shopify_access_token_encrypted
    )

    // Unregister from Shopify
    await unregisterWebhooks(store.shopify_domain, tokenData.accessToken)
  } catch (error) {
    console.error(`Failed to unregister webhooks from Shopify:`, error)
    // Continue to clean up local subscriptions even if Shopify call fails
  }

  // Clean up local subscription records
  try {
    await deleteWebhookSubscriptionsByStore(storeId)
  } catch (error) {
    console.error(`Failed to delete webhook subscriptions:`, error)
    throw error
  }
}

/**
 * Re-register missing webhooks for a store
 * Useful when webhooks are deleted or missing
 */
export async function reregisterWebhooksForStore(
  storeId: string,
  baseUrl: string
): Promise<void> {
  const store = await getStoreByIdServiceRole(storeId)
  if (!store) {
    throw new Error('Store not found')
  }

  if (!store.shopify_access_token_encrypted || !store.webhook_secret) {
    throw new Error('Store missing access token or webhook secret')
  }

  // Decrypt access token
  const tokenData = decryptCredentials<{ accessToken: string }>(
    store.shopify_access_token_encrypted
  )

  const webhookUrl = `${baseUrl}/api/webhooks/shopify`

  // Clean up old webhooks first
  const { unregisterWebhooks, registerWebhooks } = await import('@/lib/integrations/shopify/webhook')
  const { deleteWebhookSubscriptionsByStore, createWebhookSubscription } = await import(
    '@/data/database/webhook-subscription.database'
  )

  try {
    await unregisterWebhooks(store.shopify_domain, tokenData.accessToken)
    await deleteWebhookSubscriptionsByStore(storeId)
    console.log(`[Webhook] Cleaned up old webhooks for store ${storeId}`)
  } catch (error) {
    console.error(`[Webhook] Failed to clean up old webhooks:`, error)
    // Continue anyway
  }

  // Register all webhooks with new format
  const subscriptions = await registerWebhooks(
    store.shopify_domain,
    tokenData.accessToken,
    webhookUrl,
    store.webhook_secret
  )

  // Store new subscriptions
  for (const sub of subscriptions) {
    try {
      await createWebhookSubscription({
        store_id: storeId,
        shopify_webhook_id: sub.id,
        topic: sub.topic,
        webhook_url: sub.url,
      })
    } catch (error) {
      console.warn(`Failed to store subscription ${sub.id}:`, error)
    }
  }
  
  console.log(`[Webhook] Re-registered ${subscriptions.length} webhooks for store ${storeId}`)
}

