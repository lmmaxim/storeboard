import {
  createStore,
  getStoresByUserId,
  getStoreById,
  updateStore,
  deleteStore,
} from '@/data/database/store.database'
import type { Store, StoreInsert, StoreUpdate } from '@/data/types/store.types'

export async function createStoreOperation(
  userId: string,
  data: StoreInsert
): Promise<Store> {
  return await createStore(userId, data)
}

export async function getStoresOperation(userId: string): Promise<Store[]> {
  return await getStoresByUserId(userId)
}

export async function getStoreOperation(
  storeId: string,
  userId: string
): Promise<Store | null> {
  return await getStoreById(storeId, userId)
}

export async function updateStoreOperation(
  storeId: string,
  userId: string,
  updates: StoreUpdate
): Promise<Store> {
  return await updateStore(storeId, userId, updates)
}

export async function deleteStoreOperation(
  storeId: string,
  userId: string
): Promise<void> {
  return await deleteStore(storeId, userId)
}

