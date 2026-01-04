import {
  getOrdersByUserId,
  getOrdersByStoreId,
  getOrderById,
  upsertOrderFromShopify,
  type GetOrdersOptions,
} from '@/data/database/order.database'
import { getStoreById } from '@/data/database/store.database'
import { decryptCredentials } from '@/data/encryption/credentials'
import { createShopifyApiClient } from '@/lib/integrations/shopify/api'
import type { Order } from '@/data/types/order.types'
import type { Store } from '@/data/types/store.types'

/**
 * Get orders for a user (across all stores or filtered by store)
 */
export async function getOrdersOperation(
  userId: string,
  options: GetOrdersOptions = {}
): Promise<Order[]> {
  return await getOrdersByUserId(userId, options)
}

/**
 * Get orders for a specific store
 */
export async function getOrdersByStoreOperation(
  storeId: string,
  userId: string
): Promise<Order[]> {
  return await getOrdersByStoreId(storeId, userId)
}

/**
 * Get a single order by ID
 */
export async function getOrderOperation(
  orderId: string,
  userId: string
): Promise<Order | null> {
  return await getOrderById(orderId, userId)
}

/**
 * Sync orders from Shopify for a store
 * Fetches the last 50 orders and upserts them to the database
 */
export async function syncOrdersFromShopify(
  storeId: string,
  userId: string
): Promise<{ synced: number; errors: number }> {
  // Get store with credentials
  const store = await getStoreById(storeId, userId)
  if (!store) {
    throw new Error('Store not found')
  }

  if (!store.shopify_access_token_encrypted) {
    throw new Error('Store is not connected to Shopify')
  }

  // Decrypt access token
  const credentials = decryptCredentials<{ accessToken: string }>(
    store.shopify_access_token_encrypted
  )
  const accessToken = credentials.accessToken

  // Create Shopify API client
  const client = createShopifyApiClient(store.shopify_domain, accessToken)

  // Fetch last 50 orders
  const shopifyOrders = await client.fetchOrders({ limit: 50 })

  // Upsert each order
  let synced = 0
  let errors = 0

  for (const shopifyOrder of shopifyOrders) {
    try {
      await upsertOrderFromShopify(storeId, shopifyOrder)
      synced++
    } catch (error) {
      console.error(
        `Failed to sync order ${shopifyOrder.id} for store ${storeId}:`,
        error
      )
      errors++
    }
  }

  return { synced, errors }
}

/**
 * Get order statistics for a user
 */
export async function getOrderStatsOperation(userId: string): Promise<{
  totalOrders: number
  pendingAwbs: number
  pendingInvoices: number
}> {
  const orders = await getOrdersByUserId(userId)

  const totalOrders = orders.length
  const pendingAwbs = orders.filter((order) => !order.awb_number).length
  const pendingInvoices = orders.filter((order) => !order.invoice_number).length

  return {
    totalOrders,
    pendingAwbs,
    pendingInvoices,
  }
}



