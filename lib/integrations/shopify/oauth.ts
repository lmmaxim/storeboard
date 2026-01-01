import { randomBytes } from 'crypto'

/**
 * Shopify OAuth scopes required for the application
 * These match the scopes configured in the Shopify app settings
 */
export const SHOPIFY_SCOPES = [
  'read_customers',
  'read_fulfillments',
  'write_fulfillments',
  'read_orders',
  'write_orders',
  'read_products',
].join(',')

/**
 * Shopify API version to use
 */
export const SHOPIFY_API_VERSION = '2025-10'

export interface ShopifyOAuthState {
  storeId: string
  userId: string
  nonce: string
}

/**
 * Generate a secure random state parameter for OAuth
 */
export function generateOAuthState(storeId: string, userId: string): string {
  const nonce = randomBytes(16).toString('hex')
  const state: ShopifyOAuthState = {
    storeId,
    userId,
    nonce,
  }
  return Buffer.from(JSON.stringify(state)).toString('base64url')
}

/**
 * Parse and validate OAuth state parameter
 */
export function parseOAuthState(state: string): ShopifyOAuthState {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf-8')
    const parsed = JSON.parse(decoded) as ShopifyOAuthState
    
    if (!parsed.storeId || !parsed.userId || !parsed.nonce) {
      throw new Error('Invalid state structure')
    }
    
    return parsed
  } catch (error) {
    throw new Error('Invalid or corrupted OAuth state')
  }
}

/**
 * Generate Shopify OAuth authorization URL
 */
export function generateShopifyAuthUrl(
  shopifyDomain: string,
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const baseUrl = `https://${shopifyDomain}/admin/oauth/authorize`
  const params = new URLSearchParams({
    client_id: clientId,
    scope: SHOPIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
  })

  return `${baseUrl}?${params.toString()}`
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCodeForToken(
  shopifyDomain: string,
  clientId: string,
  clientSecret: string,
  code: string
): Promise<{ access_token: string; scope: string }> {
  const url = `https://${shopifyDomain}/admin/oauth/access_token`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to exchange code for token: ${response.status} ${errorText}`
    )
  }

  const data = await response.json()
  
  if (!data.access_token) {
    throw new Error('Access token not found in response')
  }

  return {
    access_token: data.access_token,
    scope: data.scope || SHOPIFY_SCOPES,
  }
}

/**
 * Verify Shopify access token by making a test API call
 */
export async function verifyAccessToken(
  shopifyDomain: string,
  accessToken: string
): Promise<boolean> {
  try {
    const url = `https://${shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}/shop.json`
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
      },
    })

    return response.ok
  } catch {
    return false
  }
}

/**
 * Get the actual granted scopes for an app installation using GraphQL
 * This is more accurate than relying on the OAuth token response
 */
export async function getGrantedScopes(
  shopifyDomain: string,
  accessToken: string
): Promise<string[]> {
  try {
    const url = `https://${shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`
    
    const query = `
      query {
        appInstallation {
          accessScopes {
            handle
          }
        }
      }
    `
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors)
      return []
    }

    const scopes = data.data?.appInstallation?.accessScopes || []
    return scopes.map((scope: { handle: string }) => scope.handle)
  } catch (error) {
    console.error('Failed to get granted scopes:', error)
    return []
  }
}

