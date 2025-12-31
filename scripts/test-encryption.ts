import { config } from 'dotenv'
import { resolve } from 'path'
import {
  encryptCredentials,
  decryptCredentials,
} from '../data/encryption/credentials'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is required in .env.local')
  }

  console.log('🔐 Testing Encryption Module\n')

  // Test 1: Basic object encryption/decryption
  console.log('Test 1: Basic object encryption/decryption')
  const testData1 = {
    apiKey: 'test-api-key-12345',
    secret: 'super-secret-value',
    shopifyDomain: 'test-store.myshopify.com',
  }

  const encrypted1 = encryptCredentials(testData1)
  console.log('✅ Encrypted:', encrypted1.substring(0, 50) + '...')

  const decrypted1 = decryptCredentials<typeof testData1>(encrypted1)
  console.log('✅ Decrypted:', decrypted1)

  const match1 = JSON.stringify(testData1) === JSON.stringify(decrypted1)
  console.log(match1 ? '✅ Roundtrip successful!' : '❌ Roundtrip failed!')
  console.log()

  // Test 2: Shopify credentials structure
  console.log('Test 2: Shopify credentials structure')
  const shopifyCreds = {
    clientId: 'abc123',
    clientSecret: 'def456',
    accessToken: 'shpat_xyz789',
    scopes: ['read_orders', 'write_orders'],
  }

  const encrypted2 = encryptCredentials(shopifyCreds)
  const decrypted2 = decryptCredentials<typeof shopifyCreds>(encrypted2)

  const match2 = JSON.stringify(shopifyCreds) === JSON.stringify(decrypted2)
  console.log(match2 ? '✅ Shopify credentials roundtrip successful!' : '❌ Failed!')
  console.log('   Original scopes:', shopifyCreds.scopes)
  console.log('   Decrypted scopes:', decrypted2.scopes)
  console.log()

  // Test 3: Courier credentials structure
  console.log('Test 3: Courier credentials structure')
  const courierCreds = {
    username: 'fancourier_user',
    password: 'secure_password_123',
    apiKey: 'fc_api_key_xyz',
  }

  const encrypted3 = encryptCredentials(courierCreds)
  const decrypted3 = decryptCredentials<typeof courierCreds>(encrypted3)

  const match3 = JSON.stringify(courierCreds) === JSON.stringify(decrypted3)
  console.log(match3 ? '✅ Courier credentials roundtrip successful!' : '❌ Failed!')
  console.log()

  // Test 4: Verify different inputs produce different encrypted outputs (IV uniqueness)
  console.log('Test 4: Verify IV uniqueness (same input, different encrypted output)')
  const sameData = { key: 'value' }
  const encrypted4a = encryptCredentials(sameData)
  const encrypted4b = encryptCredentials(sameData)

  const different = encrypted4a !== encrypted4b
  console.log(
    different
      ? '✅ Different IVs generated (security check passed)'
      : '❌ Same IV used (security issue!)'
  )
  console.log('   First encryption:', encrypted4a.substring(0, 30) + '...')
  console.log('   Second encryption:', encrypted4b.substring(0, 30) + '...')

  // Both should decrypt to the same value
  const decrypted4a = decryptCredentials<typeof sameData>(encrypted4a)
  const decrypted4b = decryptCredentials<typeof sameData>(encrypted4b)
  const bothMatch =
    JSON.stringify(decrypted4a) === JSON.stringify(decrypted4b) &&
    JSON.stringify(decrypted4a) === JSON.stringify(sameData)
  console.log(
    bothMatch
      ? '✅ Both decrypt to same value (correctness check passed)'
      : '❌ Decryption mismatch!'
  )
  console.log()

  // Test 5: Error handling - invalid format
  console.log('Test 5: Error handling - invalid encrypted format')
  try {
    decryptCredentials('invalid-format')
    console.log('❌ Should have thrown an error!')
  } catch (error) {
    console.log('✅ Correctly threw error for invalid format:', (error as Error).message)
  }
  console.log()

  // Summary
  const allTestsPassed = match1 && match2 && match3 && different && bothMatch
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  if (allTestsPassed) {
    console.log('✅ All encryption tests passed!')
  } else {
    console.log('❌ Some tests failed. Check output above.')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})

