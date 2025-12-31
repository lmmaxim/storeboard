import { config } from 'dotenv'
import { resolve } from 'path'
import { createStore, getStoresByUserId } from '../data/database/store.database'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  const userId = process.env.TEST_USER_ID

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  }

  if (!process.env.SUPABASE_SECRET_KEY) {
    throw new Error('SUPABASE_SECRET_KEY is required')
  }

  if (!userId) {
    throw new Error('TEST_USER_ID is required for the day 2 smoke test')
  }

  const store = await createStore(
    userId,
    {
      name: `Day 2 Test ${Date.now()}`,
      shopify_domain: `dev-${Date.now()}.myshopify.com`,
    },
    { useServiceRole: true }
  )

  console.log('Created store:', {
    id: store.id,
    name: store.name,
    user_id: store.user_id,
  })

  const stores = await getStoresByUserId(userId, { useServiceRole: true })
  console.log(`Fetched ${stores.length} stores for user ${userId}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

