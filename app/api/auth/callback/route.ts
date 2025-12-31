import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Determine the correct base URL - prioritize environment variable
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  
  if (!baseUrl) {
    // Fallback: try to get from headers
    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = headersList.get('x-forwarded-proto') || 
      (host?.includes('localhost') ? 'http' : 'https')
    
    if (host) {
      const redirectUrl = new URL(next, `${protocol}://${host}`)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Use environment variable if available
  const redirectUrl = new URL(next, baseUrl)
  return NextResponse.redirect(redirectUrl)
}