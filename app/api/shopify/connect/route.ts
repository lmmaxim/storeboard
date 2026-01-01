import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStoreById } from '@/data/database/store.database'

/**
 * Connect Shopify OAuth flow for a store that already has credentials
 * GET /api/shopify/connect?storeId=xxx&state=xxx&oauthUrl=xxx
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
    const state = searchParams.get('state')
    const oauthUrl = searchParams.get('oauthUrl')

    if (!storeId || !state || !oauthUrl) {
      return NextResponse.json(
        { error: 'storeId, state, and oauthUrl are required' },
        { status: 400 }
      )
    }

    // Verify store ownership
    const store = await getStoreById(storeId, user.id)
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Set state cookie and redirect to OAuth URL
    const response = NextResponse.redirect(oauthUrl)
    
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
    console.error('Shopify OAuth connection error:', error)
    return NextResponse.json(
      { error: 'Failed to connect OAuth flow' },
      { status: 500 }
    )
  }
}

