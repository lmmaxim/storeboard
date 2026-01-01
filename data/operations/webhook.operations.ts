import { upsertOrderFromShopify } from '@/data/database/order.database'
import { getStoreByDomain, updateStore } from '@/data/database/store.database'
import {
  createWebhookEvent,
  getEventByShopifyId,
  markEventProcessed,
  markEventFailed,
} from '@/data/database/webhook-event.database'
import { decryptCredentials } from '@/data/encryption/credentials'
import type { Store } from '@/data/types/store.types'
import type { ShopifyWebhookTopic } from '@/lib/integrations/shopify/webhook'

/**
 * Process a Shopify webhook event
 */
export async function processWebhookEvent(
  store: Store,
  topic: string,
  payload: Record<string, unknown>,
  shopifyWebhookId: string | null
): Promise<void> {
  // Check for duplicate webhook
  if (shopifyWebhookId) {
    const existing = await getEventByShopifyId(store.id, shopifyWebhookId)
    if (existing) {
      const existingTimestamp = new Date(existing.created_at).toISOString()
      console.log(
        `[Webhook] Duplicate webhook ignored: ${shopifyWebhookId} for store ${store.id} (${store.shopify_domain})`
      )
      console.log(
        `[Webhook] Original webhook was received at ${existingTimestamp} (topic: ${existing.topic}, processed: ${existing.processed})`
      )
      
      // Special warning for app/uninstalled duplicates
      if (topic === 'app/uninstalled' && existing.processed) {
        console.warn(
          `[Webhook] ⚠️  Duplicate app/uninstalled webhook detected - store was already marked as uninstalled at ${existingTimestamp}`
        )
      }
      
      return
    }
  }

  console.log(
    `[Webhook] Processing ${topic} for store ${store.id} (${store.shopify_domain}), webhook ID: ${shopifyWebhookId || 'none'}`
  )

  // Store the webhook event
  const event = await createWebhookEvent({
    store_id: store.id,
    topic,
    payload,
    shopify_webhook_id: shopifyWebhookId,
    processed: false,
  })

  try {
    // Process based on topic
    await processWebhookTopic(store, topic as ShopifyWebhookTopic, payload)

    // Mark as processed
    await markEventProcessed(event.id)
    console.log(
      `[Webhook] Successfully processed webhook ${event.id} (${topic}) for store ${store.id}`
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(
      `[Webhook] Failed to process webhook ${event.id} (${topic}) for store ${store.id}:`,
      errorMessage
    )
    await markEventFailed(event.id, errorMessage)
    throw error
  }
}

/**
 * Process webhook by topic
 */
async function processWebhookTopic(
  store: Store,
  topic: ShopifyWebhookTopic,
  payload: Record<string, unknown>
): Promise<void> {
  switch (topic) {
    case 'orders/create':
    case 'orders/updated': {
      const order = payload as Record<string, unknown>
      const orderId = order.id ? String(order.id) : 'unknown'
      const orderNumber = order.order_number || order.number || 'unknown'
      await upsertOrderFromShopify(store.id, order)
      console.log(
        `[Webhook] Order ${orderId} (#${orderNumber}) ${topic === 'orders/create' ? 'created' : 'updated'} for store ${store.id}`
      )
      break
    }

    case 'orders/cancelled': {
      const order = payload as Record<string, unknown>
      const orderId = order.id ? String(order.id) : 'unknown'
      const orderNumber = order.order_number || order.number || 'unknown'
      // Update order to mark as cancelled
      await upsertOrderFromShopify(store.id, {
        ...order,
        cancelled_at: order.cancelled_at || new Date().toISOString(),
      })
      console.log(
        `[Webhook] Order ${orderId} (#${orderNumber}) cancelled for store ${store.id}`
      )
      break
    }

    case 'app/uninstalled': {
      // Check if already uninstalled
      if (!store.shopify_access_token_encrypted) {
        console.warn(
          `[Webhook] ⚠️  app/uninstalled received for store ${store.id} (${store.shopify_domain}) but store is already disconnected`
        )
        // Still process to ensure clean state
      }
      
      // Clear store credentials and mark as disconnected
      // Note: We keep client_id and client_secret for potential reconnection
      await updateStore(
        store.id,
        store.user_id,
        {
          shopify_access_token_encrypted: null,
          shopify_scopes: [],
        },
        { useServiceRole: true }
      )
      
      const timestamp = new Date().toISOString()
      console.log(
        `[Webhook] Store ${store.id} (${store.shopify_domain}) marked as uninstalled at ${timestamp} - access token and scopes cleared`
      )
      console.log(
        `[Webhook] Client credentials preserved for potential reconnection`
      )
      break
    }

    case 'fulfillments/create':
    case 'fulfillments/update': {
      // For now, just log - we'll handle fulfillment updates in a future day
      const fulfillment = payload as Record<string, unknown>
      const fulfillmentId = fulfillment.id ? String(fulfillment.id) : 'unknown'
      const orderId = fulfillment.order_id ? String(fulfillment.order_id) : 'unknown'
      console.log(
        `[Webhook] Fulfillment ${fulfillmentId} for order ${orderId} (${topic}) - logged but not yet processed`
      )
      break
    }

    default:
      console.warn(`Unknown webhook topic: ${topic}`)
  }
}

