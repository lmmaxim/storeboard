import { SHOPIFY_API_VERSION } from './oauth'

/**
 * Webhook topics to subscribe to
 */
export const SHOPIFY_WEBHOOK_TOPICS = [
  'orders/create',
  'orders/updated',
  'orders/cancelled',
  'fulfillments/create',
  'fulfillments/update',
  'app/uninstalled',
] as const

export type ShopifyWebhookTopic = (typeof SHOPIFY_WEBHOOK_TOPICS)[number]

/**
 * Register webhooks for a Shopify store
 */
export async function registerWebhooks(
  shopifyDomain: string,
  accessToken: string,
  webhookUrl: string,
  webhookSecret: string
): Promise<Array<{ id: string; topic: string }>> {
  const results: Array<{ id: string; topic: string }> = []

  for (const topic of SHOPIFY_WEBHOOK_TOPICS) {
    try {
      const webhook = await createWebhook(shopifyDomain, accessToken, topic, webhookUrl, webhookSecret)
      if (webhook) {
        results.push({ id: webhook.id.toString(), topic })
      }
    } catch (error) {
      console.error(`Failed to register webhook for topic ${topic}:`, error)
      // Continue with other webhooks even if one fails
    }
  }

  return results
}

/**
 * Create a single webhook
 */
async function createWebhook(
  shopifyDomain: string,
  accessToken: string,
  topic: string,
  webhookUrl: string,
  webhookSecret: string
): Promise<{ id: number } | null> {
  const url = `https://${shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({
      webhook: {
        topic,
        address: webhookUrl,
        format: 'json',
      },
    }),
  })

  if (!response.ok) {
    // If webhook already exists, that's okay
    if (response.status === 422) {
      const error = await response.json()
      if (error.errors?.address?.includes('has already been taken')) {
        console.log(`Webhook for ${topic} already exists`)
        return null
      }
    }
    const errorText = await response.text()
    throw new Error(`Failed to create webhook: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.webhook
}

/**
 * Unregister all webhooks for a store
 */
export async function unregisterWebhooks(
  shopifyDomain: string,
  accessToken: string
): Promise<void> {
  const url = `https://${shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`

  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
    },
  })

  if (!response.ok) {
    console.error('Failed to list webhooks for deletion')
    return
  }

  const data = await response.json()
  const webhooks = data.webhooks || []

  for (const webhook of webhooks) {
    try {
      await deleteWebhook(shopifyDomain, accessToken, webhook.id)
    } catch (error) {
      console.error(`Failed to delete webhook ${webhook.id}:`, error)
    }
  }
}

/**
 * Delete a single webhook
 */
async function deleteWebhook(
  shopifyDomain: string,
  accessToken: string,
  webhookId: number
): Promise<void> {
  const url = `https://${shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}/webhooks/${webhookId}.json`

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'X-Shopify-Access-Token': accessToken,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to delete webhook: ${response.status}`)
  }
}

