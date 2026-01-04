import { SHOPIFY_API_VERSION } from './oauth'

/**
 * Create Shopify API client for a store
 */
export function createShopifyApiClient(shopifyDomain: string, accessToken: string) {
  const baseUrl = `https://${shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}`

  return {
    /**
     * Fetch orders from Shopify
     */
    async fetchOrders(options: {
      limit?: number
      status?: string
      financial_status?: string
      fulfillment_status?: string
      created_at_min?: string
      created_at_max?: string
    } = {}): Promise<Array<Record<string, unknown>>> {
      const params = new URLSearchParams()
      
      if (options.limit) {
        params.append('limit', options.limit.toString())
      }
      if (options.status) {
        params.append('status', options.status)
      }
      if (options.financial_status) {
        params.append('financial_status', options.financial_status)
      }
      if (options.fulfillment_status) {
        params.append('fulfillment_status', options.fulfillment_status)
      }
      if (options.created_at_min) {
        params.append('created_at_min', options.created_at_min)
      }
      if (options.created_at_max) {
        params.append('created_at_max', options.created_at_max)
      }

      const url = `${baseUrl}/orders.json${params.toString() ? `?${params.toString()}` : ''}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Shopify API error: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      const data = await response.json()
      return (data.orders || []) as Array<Record<string, unknown>>
    },

    /**
     * Fetch a single order by ID
     */
    async fetchOrder(orderId: string): Promise<Record<string, unknown>> {
      const url = `${baseUrl}/orders/${orderId}.json`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Shopify API error: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      const data = await response.json()
      return data.order as Record<string, unknown>
    },
  }
}

export type ShopifyApiClient = ReturnType<typeof createShopifyApiClient>



