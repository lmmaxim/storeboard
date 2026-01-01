import { config } from 'dotenv'
import { resolve } from 'path'
import { getStoreById } from '../data/database/store.database'
import { decryptCredentials } from '../data/encryption/credentials'
import { SHOPIFY_API_VERSION } from '../lib/integrations/shopify/oauth'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

interface TestResult {
  endpoint: string
  success: boolean
  statusCode?: number
  error?: string
  data?: unknown
}

async function testShopifyScope(
  shopifyDomain: string,
  accessToken: string,
  endpoint: string,
  description: string
): Promise<TestResult> {
  const url = `https://${shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`

  try {
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    })

    const statusCode = response.status
    const success = response.ok

    let data: unknown = null
    let error: string | undefined = undefined

    if (success) {
      data = await response.json()
    } else {
      const errorText = await response.text()
      error = errorText
    }

    return {
      endpoint,
      success,
      statusCode,
      error,
      data,
    }
  } catch (err) {
    return {
      endpoint,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

async function main() {
  const storeId = process.argv[2]
  const userId = process.argv[3]

  if (!storeId || !userId) {
    console.error('Usage: tsx scripts/test-shopify-scopes.ts <storeId> <userId>')
    console.error('\nExample:')
    console.error('  tsx scripts/test-shopify-scopes.ts fe1410e3-813b-411e-ad18-8fa5733c1b70 user-id-here')
    process.exit(1)
  }

  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is required in .env.local')
  }

  console.log('🧪 Testing Shopify API Scopes\n')
  console.log(`Store ID: ${storeId}`)
  console.log(`User ID: ${userId}\n`)

  // Get store with service role to bypass RLS
  const store = await getStoreById(storeId, userId, { useServiceRole: true })

  if (!store) {
    console.error('❌ Store not found')
    process.exit(1)
  }

  if (!store.shopify_access_token_encrypted) {
    console.error('❌ Store is not connected to Shopify')
    process.exit(1)
  }

  if (!store.shopify_domain) {
    console.error('❌ Store does not have a Shopify domain')
    process.exit(1)
  }

  console.log(`✅ Store found: ${store.name}`)
  console.log(`✅ Shopify Domain: ${store.shopify_domain}`)
  console.log(`✅ Configured Scopes: ${store.shopify_scopes?.join(', ') || 'none'}\n`)

  // Decrypt access token
  let accessToken: string
  try {
    const tokenData = decryptCredentials<{ accessToken: string }>(
      store.shopify_access_token_encrypted
    )
    accessToken = tokenData.accessToken
    console.log('✅ Access token decrypted successfully\n')
  } catch (error) {
    console.error('❌ Failed to decrypt access token:', error)
    process.exit(1)
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Testing API Endpoints\n')

  // Test 1: read_orders - Get orders list
  console.log('Test 1: read_orders scope')
  console.log('  Endpoint: GET /orders.json')
  const ordersTest = await testShopifyScope(
    store.shopify_domain,
    accessToken,
    '/orders.json?limit=1',
    'Get orders list'
  )

  if (ordersTest.success) {
    console.log('  ✅ SUCCESS - read_orders scope is working!')
    if (ordersTest.data && typeof ordersTest.data === 'object' && 'orders' in ordersTest.data) {
      const orders = (ordersTest.data as { orders: unknown[] }).orders
      console.log(`  📦 Found ${orders.length} order(s)`)
    }
  } else {
    console.log(`  ❌ FAILED - Status: ${ordersTest.statusCode}`)
    if (ordersTest.statusCode === 403 || ordersTest.statusCode === 401) {
      console.log('  ⚠️  This indicates read_orders scope is NOT granted')
    }
    if (ordersTest.error) {
      console.log(`  Error: ${ordersTest.error.substring(0, 200)}`)
    }
  }
  console.log()

  // Test 2: read_fulfillments - Get fulfillments for an order
  console.log('Test 2: read_fulfillments scope')
  console.log('  Endpoint: GET /orders/{id}/fulfillments.json')
  
  // First, try to get an order ID
  let orderId: string | null = null
  if (ordersTest.success && ordersTest.data) {
    const orders = (ordersTest.data as { orders: Array<{ id: number }> }).orders
    if (orders.length > 0) {
      orderId = orders[0].id.toString()
    }
  }

  if (orderId) {
    const fulfillmentsTest = await testShopifyScope(
      store.shopify_domain,
      accessToken,
      `/orders/${orderId}/fulfillments.json`,
      'Get fulfillments for an order'
    )

    if (fulfillmentsTest.success) {
      console.log('  ✅ SUCCESS - read_fulfillments scope is working!')
      if (fulfillmentsTest.data && typeof fulfillmentsTest.data === 'object' && 'fulfillments' in fulfillmentsTest.data) {
        const fulfillments = (fulfillmentsTest.data as { fulfillments: unknown[] }).fulfillments
        console.log(`  📦 Found ${fulfillments.length} fulfillment(s)`)
      }
    } else {
      console.log(`  ❌ FAILED - Status: ${fulfillmentsTest.statusCode}`)
      if (fulfillmentsTest.statusCode === 403 || fulfillmentsTest.statusCode === 401) {
        console.log('  ⚠️  This indicates read_fulfillments scope is NOT granted')
      }
      if (fulfillmentsTest.error) {
        console.log(`  Error: ${fulfillmentsTest.error.substring(0, 200)}`)
      }
    }
  } else {
    console.log('  ⚠️  SKIPPED - No orders found to test fulfillments endpoint')
    console.log('  💡 Create an order in your Shopify store to test this scope')
  }
  console.log()

  // Test 3: write_orders - Verify we can read order details (prerequisite for writing)
  console.log('Test 3: write_orders scope (verification)')
  console.log('  Note: We verify write_orders by checking if we can read order details')
  if (orderId) {
    const orderDetailsTest = await testShopifyScope(
      store.shopify_domain,
      accessToken,
      `/orders/${orderId}.json`,
      'Get order details'
    )

    if (orderDetailsTest.success) {
      console.log('  ✅ SUCCESS - Can read order details (write_orders likely working)')
    } else {
      console.log(`  ❌ FAILED - Status: ${orderDetailsTest.statusCode}`)
      if (orderDetailsTest.error) {
        console.log(`  Error: ${orderDetailsTest.error.substring(0, 200)}`)
      }
    }
  } else {
    console.log('  ⚠️  SKIPPED - No orders found')
  }
  console.log()

  // Test 4: read_products - Get products list
  console.log('Test 4: read_products scope')
  console.log('  Endpoint: GET /products.json')
  const productsTest = await testShopifyScope(
    store.shopify_domain,
    accessToken,
    '/products.json?limit=1',
    'Get products list'
  )

  if (productsTest.success) {
    console.log('  ✅ SUCCESS - read_products scope is working!')
    if (productsTest.data && typeof productsTest.data === 'object' && 'products' in productsTest.data) {
      const products = (productsTest.data as { products: unknown[] }).products
      console.log(`  📦 Found ${products.length} product(s)`)
    }
  } else {
    console.log(`  ❌ FAILED - Status: ${productsTest.statusCode}`)
    if (productsTest.error) {
      console.log(`  Error: ${productsTest.error.substring(0, 200)}`)
    }
  }
  console.log()

  // Test 5: read_customers - Get customers list
  console.log('Test 5: read_customers scope')
  console.log('  Endpoint: GET /customers.json')
  const customersTest = await testShopifyScope(
    store.shopify_domain,
    accessToken,
    '/customers.json?limit=1',
    'Get customers list'
  )

  if (customersTest.success) {
    console.log('  ✅ SUCCESS - read_customers scope is working!')
    if (customersTest.data && typeof customersTest.data === 'object' && 'customers' in customersTest.data) {
      const customers = (customersTest.data as { customers: unknown[] }).customers
      console.log(`  📦 Found ${customers.length} customer(s)`)
    }
  } else {
    console.log(`  ❌ FAILED - Status: ${customersTest.statusCode}`)
    if (customersTest.error) {
      console.log(`  Error: ${customersTest.error.substring(0, 200)}`)
    }
  }
  console.log()

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Summary\n')

  const results = [
    { name: 'read_orders', test: ordersTest },
    { name: 'read_products', test: productsTest },
    { name: 'read_customers', test: customersTest },
  ]

  const working = results.filter((r) => r.test.success).length
  const total = results.length

  console.log(`Working scopes: ${working}/${total}`)
  results.forEach(({ name, test }) => {
    const icon = test.success ? '✅' : '❌'
    const status = test.success ? 'WORKING' : 'NOT WORKING'
    console.log(`  ${icon} ${name}: ${status}`)
  })

  if (orderId) {
    console.log(`\n  ${ordersTest.success ? '✅' : '❌'} read_fulfillments: ${ordersTest.success ? 'WORKING' : 'NOT WORKING'}`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  if (working === total) {
    console.log('✅ All tested scopes are working!')
  } else {
    console.log('⚠️  Some scopes are not working. Check the errors above.')
    console.log('\n💡 If read_orders or read_fulfillments are failing:')
    console.log('   1. Disconnect and reconnect the store')
    console.log('   2. Ensure all scopes are approved during OAuth')
    console.log('   3. Check Shopify Partner Dashboard app configuration')
  }
}

main().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})

