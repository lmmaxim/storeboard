import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStoreById, updateStore } from '@/data/database/store.database'
import {
  parseOAuthState,
  exchangeCodeForToken,
  getGrantedScopes,
  SHOPIFY_SCOPES,
} from '@/lib/integrations/shopify/oauth'
import { decryptCredentials, encryptCredentials } from '@/data/encryption/credentials'
import { registerWebhooks, unregisterWebhooks } from '@/lib/integrations/shopify/webhook'
import { createWebhookSubscription, deleteWebhookSubscriptionsByStore } from '@/data/database/webhook-subscription.database'
import { randomBytes } from 'crypto'

/**
 * Handle Shopify OAuth callback
 * GET /api/shopify/callback?code=xxx&state=xxx&shop=xxx
 */
export async function GET(request: NextRequest) {
  // Helper function to get base URL
  function getBaseUrl(): string {
    const origin = request.headers.get('origin') || request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    return process.env.NEXT_PUBLIC_APP_URL || 
      (origin ? `${protocol}://${origin}` : 'http://localhost:3000')
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const baseUrl = getBaseUrl()

    if (!user) {
      return NextResponse.redirect(`${baseUrl}/signin?error=unauthorized`)
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const shop = searchParams.get('shop')

    // Verify state parameter
    // For new flow, state might not be in cookie yet, so we'll verify it matches the parsed state
    const cookieState = request.cookies.get('shopify_oauth_state')?.value
    if (!state) {
      return NextResponse.redirect(`${baseUrl}/stores?error=invalid_state`)
    }
    
    // If cookie exists, verify it matches
    if (cookieState && state !== cookieState) {
      return NextResponse.redirect(`${baseUrl}/stores?error=invalid_state`)
    }

    // Parse state to get storeId and userId
    let oauthState
    try {
      oauthState = parseOAuthState(state)
    } catch (error) {
      return NextResponse.redirect(`${baseUrl}/stores?error=invalid_state`)
    }

    // Verify user matches
    if (oauthState.userId !== user.id) {
      return NextResponse.redirect(`${baseUrl}/stores?error=unauthorized`)
    }

    // Get store
    const store = await getStoreById(oauthState.storeId, user.id)
    if (!store) {
      return NextResponse.redirect(`${baseUrl}/stores?error=store_not_found`)
    }

    // Verify shop domain matches
    if (shop && shop !== store.shopify_domain) {
      return NextResponse.redirect(
        `${baseUrl}/stores?error=domain_mismatch`
      )
    }

    // Get client credentials from cookie or store
    let clientId: string
    let clientSecret: string
    
    const encryptedCredentials = request.cookies.get('shopify_oauth_creds')?.value
    if (encryptedCredentials) {
      // Old flow: credentials in cookie
      try {
        const credentials = decryptCredentials<{ clientId: string; clientSecret: string }>(
          encryptedCredentials
        )
        clientId = credentials.clientId
        clientSecret = credentials.clientSecret
      } catch (error) {
        return NextResponse.redirect(
          `${baseUrl}/stores?error=invalid_credentials`
        )
      }
    } else if (store.shopify_client_id_encrypted && store.shopify_client_secret_encrypted) {
      // New flow: credentials already in store
      try {
        const clientIdData = decryptCredentials<{ clientId: string }>(
          store.shopify_client_id_encrypted
        )
        const clientSecretData = decryptCredentials<{ clientSecret: string }>(
          store.shopify_client_secret_encrypted
        )
        clientId = clientIdData.clientId
        clientSecret = clientSecretData.clientSecret
      } catch (error) {
        return NextResponse.redirect(
          `${baseUrl}/stores?error=invalid_credentials`
        )
      }
    } else {
      return NextResponse.redirect(
        `${baseUrl}/stores?error=missing_credentials`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/stores?error=no_code`
      )
    }

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(
      store.shopify_domain,
      clientId,
      clientSecret,
      code
    )

    // Get actual granted scopes from GraphQL API (more accurate than token response)
    const grantedScopes = await getGrantedScopes(
      store.shopify_domain,
      tokenData.access_token
    )

    // Generate webhook secret if not exists
    let webhookSecret = store.webhook_secret
    if (!webhookSecret) {
      webhookSecret = randomBytes(32).toString('hex')
    }

    // Use generic webhook URL (store resolved by X-Shopify-Shop-Domain)
    const webhookUrl = `${baseUrl}/api/webhooks/shopify`

    // Clean up old webhooks and subscriptions before registering new ones
    // This ensures we only have webhooks with the correct URL format
    try {
      // Delete all existing webhooks from Shopify (removes old URLs with store ID in path)
      await unregisterWebhooks(store.shopify_domain, tokenData.access_token)
      
      // Delete old subscription records from database
      await deleteWebhookSubscriptionsByStore(oauthState.storeId)
      
      console.log(`[OAuth] Cleaned up old webhooks for store ${oauthState.storeId}`)
    } catch (error) {
      console.error('Failed to clean up old webhooks (continuing anyway):', error)
      // Continue even if cleanup fails - we'll try to register new ones
    }

    // Register webhooks with the correct generic URL format
    try {
      const subscriptions = await registerWebhooks(
        store.shopify_domain,
        tokenData.access_token,
        webhookUrl,
        webhookSecret
      )

      // Store subscription records
      for (const sub of subscriptions) {
        try {
          await createWebhookSubscription({
            store_id: oauthState.storeId,
            shopify_webhook_id: sub.id,
            topic: sub.topic,
            webhook_url: sub.url,
          })
        } catch (error) {
          // If subscription already exists, that's okay
          console.warn(`Subscription ${sub.id} may already exist:`, error)
        }
      }
      
      console.log(`[OAuth] Registered ${subscriptions.length} webhooks with generic URL format for store ${oauthState.storeId}`)
    } catch (error) {
      console.error('Failed to register webhooks:', error)
      // Continue even if webhook registration fails - we can retry later
    }

    // Encrypt and store credentials
    const encryptedClientId = encryptCredentials({ clientId })
    const encryptedClientSecret = encryptCredentials({ clientSecret })
    const encryptedAccessToken = encryptCredentials({ accessToken: tokenData.access_token })
    
    // Use GraphQL-granted scopes if available, otherwise fall back to token response
    // If neither is available, use requested scopes as fallback
    const scopes = grantedScopes.length > 0 
      ? grantedScopes 
      : (tokenData.scope 
          ? tokenData.scope.split(',').map((s) => s.trim())
          : SHOPIFY_SCOPES.split(',').map((s) => s.trim()))

    // Update store with credentials
    await updateStore(
      oauthState.storeId,
      user.id,
      {
        shopify_client_id_encrypted: encryptedClientId,
        shopify_client_secret_encrypted: encryptedClientSecret,
        shopify_access_token_encrypted: encryptedAccessToken,
        shopify_scopes: scopes,
        webhook_secret: webhookSecret,
      }
    )

    // Clear OAuth cookies
    const response = NextResponse.redirect(
      `${baseUrl}/stores?success=connected`
    )
    response.cookies.delete('shopify_oauth_state')
    response.cookies.delete('shopify_oauth_creds')

    return response
  } catch (error) {
    console.error('Shopify OAuth callback error:', error)
    const baseUrl = getBaseUrl()
    let storeId = 'unknown'
    
    try {
      const state = request.nextUrl.searchParams.get('state')
      if (state) {
        const oauthState = parseOAuthState(state)
        storeId = oauthState.storeId
      }
    } catch {
      // Ignore parsing errors
    }
    
    return NextResponse.redirect(
      `${baseUrl}/stores?error=oauth_failed`
    )
  }
}

