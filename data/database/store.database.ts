import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
} from '@/data/database/client'
import type { Store, StoreInsert, StoreUpdate } from '@/data/types/store.types'

const TABLE = 'stores'

function resolveClient(useServiceRole: boolean) {
  if (useServiceRole) {
    return getSupabaseServiceClient()
  }

  return getSupabaseServerClient()
}

function toStore(record: unknown): Store {
  if (!record) {
    throw new Error('Store record is missing')
  }

  return record as Store
}

export async function createStore(
  userId: string,
  payload: StoreInsert,
  { useServiceRole = false }: { useServiceRole?: boolean } = {}
): Promise<Store> {
  const supabase = await resolveClient(useServiceRole)

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...payload, user_id: userId })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return toStore(data)
}

export async function getStoresByUserId(
  userId: string,
  { useServiceRole = false }: { useServiceRole?: boolean } = {}
): Promise<Store[]> {
  const supabase = await resolveClient(useServiceRole)

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Store[]
}

export async function getStoreById(
  storeId: string,
  userId: string,
  { useServiceRole = false }: { useServiceRole?: boolean } = {}
): Promise<Store | null> {
  const supabase = await resolveClient(useServiceRole)

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', storeId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  return toStore(data)
}

export async function updateStore(
  storeId: string,
  userId: string,
  updates: StoreUpdate,
  { useServiceRole = false }: { useServiceRole?: boolean } = {}
): Promise<Store> {
  const supabase = await resolveClient(useServiceRole)

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      ...updates,
      updated_at: updates.updated_at ?? new Date().toISOString(),
    })
    .eq('id', storeId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return toStore(data)
}

export async function deleteStore(
  storeId: string,
  userId: string
): Promise<void> {
  const supabase = await getSupabaseServerClient()

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', storeId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

