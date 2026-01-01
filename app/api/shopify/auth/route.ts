import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStoreById } from '@/data/database/store.database'
import { generateShopifyAuthUrl, generateOAuthState } from '@/lib/integrations/shopify/oauth'
import { encryptCredentials } from '@/data/encryption/credentials'

/**
 * Initiate Shopify OAuth flow
 * GET /api/shopify/auth?storeId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const storeId = searchParams.get('storeId')

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 })
    }

    // Verify store ownership
    const store = await getStoreById(storeId, user.id)
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Get client ID and secret from request or store
    const clientId = searchParams.get('clientId')
    const clientSecret = searchParams.get('clientSecret')

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Client ID and Client Secret are required' },
        { status: 400 }
      )
    }

    // Store encrypted credentials temporarily (will be saved after OAuth)
    // For now, we'll pass them in the state and save after successful OAuth
    const state = generateOAuthState(storeId, user.id)

    // Get redirect URI
    const origin = request.headers.get('origin') || request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (origin ? `${protocol}://${origin}` : 'http://localhost:3000')
    const redirectUri = `${baseUrl}/api/shopify/callback`

    // Generate Shopify OAuth URL
    const authUrl = generateShopifyAuthUrl(
      store.shopify_domain,
      clientId,
      redirectUri,
      state
    )

    // Store client credentials in a secure cookie (encrypted) for the callback
    // We'll use a session cookie that expires in 10 minutes
    const encryptedCredentials = encryptCredentials({ clientId, clientSecret })
    
    const response = NextResponse.redirect(authUrl)
    
    // Store encrypted credentials in httpOnly cookie
    response.cookies.set('shopify_oauth_creds', encryptedCredentials, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    // Store state in cookie for verification
    response.cookies.set('shopify_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Shopify OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    )
  }
}

