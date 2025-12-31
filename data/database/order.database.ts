import { getSupabaseServerClient } from '@/data/database/client'
import type { Order, OrderInsert, OrderUpdate } from '@/data/types/order.types'

type OrderWithStore = Order & { stores?: { id: string; user_id: string } }

const TABLE = 'orders'

async function assertStoreOwnership(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  storeId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    throw new Error('Store not found or access denied')
  }
}

function normalizeOrder(record: OrderWithStore | null): Order | null {
  if (!record) {
    return null
  }

  const { stores: _store, ...rest } = record
  return rest
}

export async function insertOrder(
  userId: string,
  payload: OrderInsert
): Promise<Order> {
  const supabase = await getSupabaseServerClient()

  await assertStoreOwnership(supabase, payload.store_id, userId)

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeOrder(data as OrderWithStore) as Order
}

export async function getOrdersByStoreId(
  storeId: string,
  userId: string
): Promise<Order[]> {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from(TABLE)
    .select('*, stores!inner(id, user_id)')
    .eq('store_id', storeId)
    .eq('stores.user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((record) =>
    normalizeOrder(record as OrderWithStore)
  ) as Order[]
}

export async function getOrderById(
  orderId: string,
  userId: string
): Promise<Order | null> {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from(TABLE)
    .select('*, stores!inner(id, user_id)')
    .eq('id', orderId)
    .eq('stores.user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  return normalizeOrder(data as OrderWithStore)
}

export async function updateOrder(
  orderId: string,
  userId: string,
  updates: OrderUpdate
): Promise<Order> {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      ...updates,
      updated_at: updates.updated_at ?? new Date().toISOString(),
    })
    .eq('id', orderId)
    .select('*, stores!inner(id, user_id)')
    .eq('stores.user_id', userId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeOrder(data as OrderWithStore) as Order
}

export async function deleteOrder(
  orderId: string,
  userId: string
): Promise<void> {
  const supabase = await getSupabaseServerClient()

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', orderId)
    .select('id, store_id, stores!inner(user_id)')
    .eq('stores.user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message)
  }
}

