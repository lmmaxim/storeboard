'use server'

import { createClient } from '@/lib/supabase/server'
import { createStoreOperation, updateStoreOperation, deleteStoreOperation } from '@/data/operations/store.operations'
import { revalidatePath } from 'next/cache'
import type { StoreInsert, StoreUpdate } from '@/data/types/store.types'

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
  revalidatePath(`/stores/${storeId}/settings`)
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

