import { NextRequest, NextResponse } from 'next/server'
import { getStoreByDomain } from '@/data/database/store.database'
import { processWebhookEvent } from '@/data/operations/webhook.operations'
import {
  verifyShopifyWebhook,
  extractWebhookHeaders,
} from '@/lib/integrations/shopify/webhook'
import { decryptCredentials } from '@/data/encryption/credentials'

/**
 * Generic Shopify webhook endpoint
 * Derives store from X-Shopify-Shop-Domain header
 * POST /api/webhooks/shopify
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for HMAC verification
    const rawBody = await request.text()
    const headers = extractWebhookHeaders(request.headers)

    // Validate required headers
    if (!headers.shopDomain) {
      return NextResponse.json(
        { error: 'Missing X-Shopify-Shop-Domain header' },
        { status: 400 }
      )
    }

    if (!headers.topic) {
      return NextResponse.json(
        { error: 'Missing X-Shopify-Topic header' },
        { status: 400 }
      )
    }

    if (!headers.hmac) {
      return NextResponse.json(
        { error: 'Missing X-Shopify-Hmac-Sha256 header' },
        { status: 401 }
      )
    }

    // Look up store by domain
    const store = await getStoreByDomain(headers.shopDomain, {
      useServiceRole: true,
    })

    if (!store) {
      console.error(
        `[Webhook] Store not found for domain: ${headers.shopDomain}, topic: ${headers.topic}`
      )
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    // Shopify uses the Client Secret for webhook HMAC verification
    // Try to get Client Secret from store
    let webhookSecret: string | null = null
    
    if (store.shopify_client_secret_encrypted) {
      try {
        const clientSecretData = decryptCredentials<{ clientSecret: string }>(
          store.shopify_client_secret_encrypted
        )
        webhookSecret = clientSecretData.clientSecret
      } catch (error) {
        console.error(
          `[Webhook] Failed to decrypt client secret for store ${store.id}:`,
          error
        )
      }
    }

    // Fallback to stored webhook_secret if Client Secret is not available
    // (for backward compatibility or custom setups)
    if (!webhookSecret && store.webhook_secret) {
      webhookSecret = store.webhook_secret
    }

    if (!webhookSecret) {
      console.error(
        `[Webhook] Store ${store.id} (${store.shopify_domain}) missing webhook secret (Client Secret or webhook_secret), topic: ${headers.topic}`
      )
      return NextResponse.json(
        { error: 'Store webhook secret not configured' },
        { status: 500 }
      )
    }

    // Verify HMAC signature
    const isValid = verifyShopifyWebhook(
      rawBody,
      headers.hmac,
      webhookSecret
    )

    if (!isValid) {
      console.error(
        `[Webhook] Invalid HMAC for store ${store.id} (${store.shopify_domain}), topic: ${headers.topic}`
      )
      // Log additional debug info
      console.error(
        `[Webhook] Debug - Payload length: ${rawBody.length}, HMAC header: ${headers.hmac?.substring(0, 20)}...`
      )
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Log webhook receipt with timestamp and details
    const timestamp = new Date().toISOString()
    console.log(
      `[Webhook] Received ${headers.topic} for store ${store.id} (${store.shopify_domain}) at ${timestamp}, webhook ID: ${headers.webhookId || 'none'}`
    )
    
    // Special logging for app/uninstalled to help debug unexpected triggers
    if (headers.topic === 'app/uninstalled') {
      console.warn(
        `[Webhook] ⚠️  APP/UNINSTALLED webhook received for store ${store.id} (${store.shopify_domain}) at ${timestamp}`
      )
      console.warn(
        `[Webhook] Store connection status: access_token=${!!store.shopify_access_token_encrypted}, client_id=${!!store.shopify_client_id_encrypted}`
      )
    }

    // Parse payload
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(rawBody)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    // Process webhook asynchronously (don't await)
    // Return 200 immediately to acknowledge receipt
    processWebhookEvent(
      store,
      headers.topic,
      payload,
      headers.webhookId
    ).catch((error) => {
      console.error(
        `[Webhook] Failed to process webhook for store ${store.id} (${store.shopify_domain}):`,
        error
      )
    })

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[Webhook] Endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

