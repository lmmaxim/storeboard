import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
} from '@/data/database/client'
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

export interface GetOrdersOptions {
  limit?: number
  storeId?: string
}

export async function getOrdersByUserId(
  userId: string,
  options: GetOrdersOptions = {}
): Promise<Order[]> {
  const supabase = await getSupabaseServerClient()

  let query = supabase
    .from(TABLE)
    .select('*, stores!inner(id, user_id)')
    .eq('stores.user_id', userId)
    .order('created_at', { ascending: false })

  if (options.storeId) {
    query = query.eq('store_id', options.storeId)
  }

  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

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

/**
 * Upsert order from Shopify webhook (service role only)
 * Used by webhook processing to create/update orders
 */
export async function upsertOrderFromShopify(
  storeId: string,
  shopifyOrder: Record<string, unknown>
): Promise<Order> {
  const supabase = getSupabaseServiceClient()

  // Extract essential fields from Shopify order
  const shopifyOrderId = String(shopifyOrder.id || '')
  const shopifyOrderNumber = String(shopifyOrder.order_number || shopifyOrder.number || '')
  
  // Customer info
  const customer = shopifyOrder.customer as Record<string, unknown> | undefined
  const customerName = customer
    ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || null
    : null
  const customerEmail = customer?.email ? String(customer.email) : null
  const customerPhone = customer?.phone ? String(customer.phone) : null

  // Shipping address
  const shippingAddress = shopifyOrder.shipping_address as Record<string, unknown> | undefined
  const shippingAddressData = shippingAddress
    ? {
        first_name: shippingAddress.first_name ? String(shippingAddress.first_name) : undefined,
        last_name: shippingAddress.last_name ? String(shippingAddress.last_name) : undefined,
        address1: shippingAddress.address1 ? String(shippingAddress.address1) : undefined,
        address2: shippingAddress.address2 ? String(shippingAddress.address2) : undefined,
        city: shippingAddress.city ? String(shippingAddress.city) : undefined,
        province: shippingAddress.province ? String(shippingAddress.province) : undefined,
        country: shippingAddress.country ? String(shippingAddress.country) : undefined,
        zip: shippingAddress.zip ? String(shippingAddress.zip) : undefined,
        phone: shippingAddress.phone ? String(shippingAddress.phone) : undefined,
        company: shippingAddress.company ? String(shippingAddress.company) : undefined,
      }
    : null

  // Line items
  const lineItems = (shopifyOrder.line_items as Array<Record<string, unknown>> | undefined)?.map(
    (item) => ({
      id: item.id ? String(item.id) : undefined,
      title: item.title ? String(item.title) : undefined,
      sku: item.sku ? String(item.sku) : undefined,
      quantity: Number(item.quantity) || 0,
      price: item.price ? Number(item.price) : undefined,
      variant_id: item.variant_id ? String(item.variant_id) : undefined,
    })
  ) || null

  // Totals
  const totalPrice = shopifyOrder.total_price
    ? String(shopifyOrder.total_price)
    : null
  const currency = shopifyOrder.currency ? String(shopifyOrder.currency) : 'RON'

  // Status
  const financialStatus = shopifyOrder.financial_status
    ? String(shopifyOrder.financial_status)
    : null
  const fulfillmentStatus = shopifyOrder.fulfillment_status
    ? String(shopifyOrder.fulfillment_status)
    : null

  // Dates
  const shopifyCreatedAt = shopifyOrder.created_at
    ? new Date(String(shopifyOrder.created_at)).toISOString()
    : null
  const cancelledAt = shopifyOrder.cancelled_at
    ? new Date(String(shopifyOrder.cancelled_at)).toISOString()
    : null

  const orderData: OrderInsert = {
    store_id: storeId,
    shopify_order_id: shopifyOrderId,
    shopify_order_number: shopifyOrderNumber,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    shipping_address: shippingAddressData,
    line_items: lineItems,
    total_price: totalPrice,
    currency,
    financial_status: financialStatus,
    fulfillment_status: fulfillmentStatus,
    cancelled_at: cancelledAt,
    shopify_created_at: shopifyCreatedAt,
    synced_at: new Date().toISOString(),
  }

  // Use upsert (insert or update on conflict)
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(orderData, {
      onConflict: 'store_id,shopify_order_id',
      ignoreDuplicates: false,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to upsert order: ${error.message}`)
  }

  return normalizeOrder(data as OrderWithStore) as Order
}

/**
 * Update order AWB fields
 */
export async function updateOrderAwb(
  orderId: string,
  userId: string,
  awbData: {
    awb_number: string
    awb_created_at?: string
    awb_pdf_url?: string | null
  }
): Promise<Order> {
  return updateOrder(orderId, userId, {
    awb_number: awbData.awb_number,
    awb_created_at: awbData.awb_created_at ?? new Date().toISOString(),
    awb_pdf_url: awbData.awb_pdf_url ?? null,
  })
}

/**
 * Update order invoice fields
 */
export async function updateOrderInvoice(
  orderId: string,
  userId: string,
  invoiceData: {
    invoice_number: string
    invoice_created_at?: string
    invoice_pdf_url?: string | null
  }
): Promise<Order> {
  return updateOrder(orderId, userId, {
    invoice_number: invoiceData.invoice_number,
    invoice_created_at: invoiceData.invoice_created_at ?? new Date().toISOString(),
    invoice_pdf_url: invoiceData.invoice_pdf_url ?? null,
  })
}

