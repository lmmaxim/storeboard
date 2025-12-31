import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

let serviceClient: SupabaseClient | null = null

export async function getSupabaseServerClient() {
  return createServerClient()
}

export function getSupabaseServiceClient(): SupabaseClient {
  if (serviceClient) {
    return serviceClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY

  if (!url || !secret) {
    throw new Error('SUPABASE_SECRET_KEY or NEXT_PUBLIC_SUPABASE_URL is not set')
  }

  serviceClient = createSupabaseClient(url, secret)
  return serviceClient
}

