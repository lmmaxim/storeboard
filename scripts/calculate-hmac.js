const crypto = require('crypto');
const fs = require('fs');

// Read payload exactly as it will be sent (no extra processing)
//const payload = fs.readFileSync('scripts/webhook-updated.json', 'utf8');
const payload = '{}'; // Empty JSON object

// Trim any trailing newlines/whitespace that might cause issues
const cleanPayload = payload.trim();

// Your webhook secret from database (should be hex string, not base64)
const secret = '54a7326ae7426c4634bc11faad06c1e31139bd0a19b5735667c56ef647fd482e';

// Calculate HMAC
const hmac = crypto.createHmac('sha256', secret)
  .update(payload, 'utf8')  // Use original payload, not cleaned
  .digest('base64');

console.log('Payload length:', payload.length);
console.log('Payload (first 100 chars):', payload.substring(0, 100));
console.log('HMAC:', hmac);
console.log('Full header value: sha256=' + hmac);
console.log('\nUse this in your curl command:');
console.log('-H "X-Shopify-Hmac-Sha256: sha256=' + hmac + '"');