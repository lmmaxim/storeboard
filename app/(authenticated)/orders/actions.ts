'use server'

import { createClient } from '@/lib/supabase/server'
import { syncOrdersFromShopify } from '@/data/operations/order.operations'
import { revalidatePath } from 'next/cache'

/**
 * Sync orders from Shopify for a specific store
 */
export async function syncOrdersAction(storeId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const result = await syncOrdersFromShopify(storeId, user.id)
    
    revalidatePath('/orders')
    revalidatePath('/dashboard')
    revalidatePath(`/stores/${storeId}/settings`)
    
    return {
      success: true,
      synced: result.synced,
      errors: result.errors,
    }
  } catch (error) {
    console.error('Failed to sync orders:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync orders',
    }
  }
}



