export interface ShippingAddress {
  first_name?: string
  last_name?: string
  address1?: string
  address2?: string
  city?: string
  province?: string
  country?: string
  zip?: string
  phone?: string
  company?: string
}

export interface OrderLineItem {
  id?: string
  title?: string
  sku?: string
  quantity: number
  price?: number
  variant_id?: string
}

export interface Order {
  id: string
  store_id: string
  shopify_order_id: string
  shopify_order_number: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  shipping_address: ShippingAddress | null
  line_items: OrderLineItem[] | null
  total_price: string | null
  currency: string
  financial_status: string | null
  fulfillment_status: string | null
  cancelled_at: string | null
  awb_number: string | null
  awb_created_at: string | null
  awb_pdf_url: string | null
  invoice_number: string | null
  invoice_created_at: string | null
  invoice_pdf_url: string | null
  shopify_created_at: string | null
  synced_at: string | null
  created_at: string
  updated_at: string
}

export interface OrderInsert {
  store_id: string
  shopify_order_id: string
  shopify_order_number: string
  customer_name?: string | null
  customer_email?: string | null
  customer_phone?: string | null
  shipping_address?: ShippingAddress | null
  line_items?: OrderLineItem[] | null
  total_price?: string | null
  currency?: string
  financial_status?: string | null
  fulfillment_status?: string | null
  cancelled_at?: string | null
  awb_number?: string | null
  awb_created_at?: string | null
  awb_pdf_url?: string | null
  invoice_number?: string | null
  invoice_created_at?: string | null
  invoice_pdf_url?: string | null
  shopify_created_at?: string | null
  synced_at?: string | null
  created_at?: string
}

export interface OrderUpdate {
  customer_name?: string | null
  customer_email?: string | null
  customer_phone?: string | null
  shipping_address?: ShippingAddress | null
  line_items?: OrderLineItem[] | null
  total_price?: string | null
  currency?: string
  financial_status?: string | null
  fulfillment_status?: string | null
  cancelled_at?: string | null
  awb_number?: string | null
  awb_created_at?: string | null
  awb_pdf_url?: string | null
  invoice_number?: string | null
  invoice_created_at?: string | null
  invoice_pdf_url?: string | null
  shopify_created_at?: string | null
  synced_at?: string | null
  updated_at?: string
}

