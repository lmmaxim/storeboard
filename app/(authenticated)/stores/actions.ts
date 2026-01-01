'use server'

import { createClient } from '@/lib/supabase/server'
import { createStoreOperation, updateStoreOperation, deleteStoreOperation, getStoreOperation } from '@/data/operations/store.operations'
import { revalidatePath } from 'next/cache'
import type { StoreInsert, StoreUpdate } from '@/data/types/store.types'
import { encryptCredentials } from '@/data/encryption/credentials'
import { generateShopifyAuthUrl, generateOAuthState } from '@/lib/integrations/shopify/oauth'

export async function createStoreAction(data: StoreInsert) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const store = await createStoreOperation(user.id, data)
  revalidatePath('/stores')
  revalidatePath('/dashboard')
  return { success: true, store }
}

export async function updateStoreAction(storeId: string, data: StoreUpdate) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const store = await updateStoreOperation(storeId, user.id, data)
  revalidatePath('/stores')
  revalidatePath('/dashboard')
  return { success: true, store }
}

export async function deleteStoreAction(storeId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  await deleteStoreOperation(storeId, user.id)
  revalidatePath('/stores')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function disconnectShopifyAction(storeId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Get store to check if connected and get credentials for webhook cleanup
  const store = await getStoreOperation(storeId, user.id)
  if (!store) {
    throw new Error('Store not found')
  }

  // If connected, try to unregister webhooks
  if (store.shopify_access_token_encrypted && store.shopify_domain) {
    try {
      const { decryptCredentials } = await import('@/data/encryption/credentials')
      const { unregisterWebhooks } = await import('@/lib/integrations/shopify/webhook')
      
      const tokenData = decryptCredentials<{ accessToken: string }>(
        store.shopify_access_token_encrypted
      )
      
      await unregisterWebhooks(store.shopify_domain, tokenData.accessToken)
    } catch (error) {
      console.error('Failed to unregister webhooks during disconnect:', error)
      // Continue with disconnect even if webhook cleanup fails
    }
  }

  // Clear Shopify credentials
  await updateStoreOperation(storeId, user.id, {
    shopify_client_id_encrypted: null,
    shopify_client_secret_encrypted: null,
    shopify_access_token_encrypted: null,
    shopify_scopes: [],
    webhook_secret: null,
  })

  revalidatePath('/stores')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function connectStoreAction(data: {
  name: string
  shopify_domain: string
  client_id: string
  client_secret: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Validate domain format
    if (!data.shopify_domain.endsWith('.myshopify.com')) {
      return { success: false, error: 'Invalid Shopify domain format' }
    }

    // Validate client ID and secret format
    // Client IDs are 32-character hexadecimal strings
    const hexPattern = /^[a-f0-9]{32}$/i
    if (!hexPattern.test(data.client_id)) {
      return { success: false, error: 'Invalid Client ID format. Must be a 32-character hexadecimal string' }
    }

    // Client Secrets start with shpss_ followed by a hexadecimal string
    const clientSecretPattern = /^shpss_[a-f0-9]{32}$/i
    if (!clientSecretPattern.test(data.client_secret)) {
      return { success: false, error: 'Invalid Client Secret format. Must start with shpss_ followed by a hexadecimal string' }
    }

    // Encrypt credentials
    const encryptedClientId = encryptCredentials({ clientId: data.client_id })
    const encryptedClientSecret = encryptCredentials({ clientSecret: data.client_secret })

    // Create store with encrypted credentials
    const store = await createStoreOperation(user.id, {
      name: data.name,
      shopify_domain: data.shopify_domain,
      shopify_client_id_encrypted: encryptedClientId,
      shopify_client_secret_encrypted: encryptedClientSecret,
    })

    // Generate OAuth state
    const state = generateOAuthState(store.id, user.id)

    // Get redirect URI
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/shopify/callback`

    // Generate Shopify OAuth URL
    const authUrl = generateShopifyAuthUrl(
      data.shopify_domain,
      data.client_id,
      redirectUri,
      state
    )

    // Store encrypted credentials in a secure cookie for the callback
    // We'll need to set this cookie in the response, but since this is a server action,
    // we'll return the URL and let the client handle the redirect with cookies
    // Actually, we need to set cookies before redirect, so we'll use a different approach:
    // Return the OAuth URL and store credentials in a way the callback can access them
    
    // For now, we'll store the credentials in the store (they're already encrypted)
    // and the callback will use them from the store record

    revalidatePath('/stores')
    revalidatePath('/dashboard')

    // Return success with OAuth URL for client-side redirect
    return {
      success: true,
      store,
      oauthUrl: authUrl,
      state,
    }
  } catch (error) {
    console.error('Connect store error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to connect store'
    
    // Check if it's a duplicate domain error
    if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
      return { success: false, error: 'A store with this domain already exists' }
    }
    
    return { success: false, error: errorMessage }
  }
}

