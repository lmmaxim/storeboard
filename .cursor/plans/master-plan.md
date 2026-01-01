# Storeboard Development Plan

> **App**: Storeboard  
> **Domain**: storeboard.app (dev.storeboard.app for development)  
> **Stack**: Next.js 16, TypeScript, Supabase, Vercel  
> **Shopify API**: 2025-10  

---

## Project Overview

Storeboard is a multi-store order management dashboard that integrates with:
- **Shopify** (custom apps per store via OAuth)
- **FanCourier** (AWB generation, extensible to other couriers)
- **SmartBill** (Invoice generation, extensible to other providers)

### Key Features
- Google OAuth authentication via Supabase
- Multi-store management (1 user per store)
- Unified order view across all stores
- Manual AWB and Invoice generation (with bulk support)
- Order reconciliation (webhook + manual sync)
- Encrypted credentials per store
- In-app notifications panel for errors and alerts

---

## Architecture Decisions

### Data Access Layer (DAL)
All database operations go through `/data` folder:
```
/data
  /database          # Database CRUD operations
  /operations        # Business logic, orchestration
  /types             # Shared types
  /encryption        # Credential encryption utilities
```

### Provider Pattern for Integrations
```
/lib
  /integrations
    /couriers
      /base          # Abstract courier interface
      /fancourier    # FanCourier implementation
    /invoicing
      /base          # Abstract invoice interface
      /smartbill     # SmartBill implementation
```

### Mocking Strategy
Early days use mock implementations that:
- Console.log API payloads
- Return realistic mock responses
- Can be toggled via environment variable `USE_MOCK_INTEGRATIONS=true`

---

## Database Schema Overview

```sql
-- Users (managed by Supabase Auth)

-- Stores
stores (
  id, user_id, name, shopify_domain, 
  shopify_client_id_encrypted, shopify_client_secret_encrypted,
  shopify_access_token_encrypted, shopify_scopes,
  courier_provider, courier_credentials_encrypted,
  invoice_provider, invoice_credentials_encrypted,
  webhook_secret, created_at, updated_at
)

-- Orders (essential fields only)
orders (
  id, store_id, shopify_order_id, shopify_order_number,
  customer_name, customer_email, customer_phone,
  shipping_address_json, line_items_json,
  total_price, currency, financial_status, fulfillment_status,
  awb_number, awb_created_at, awb_pdf_url,
  invoice_number, invoice_created_at, invoice_pdf_url,
  shopify_created_at, synced_at, created_at, updated_at
)

-- Webhook Events (for debugging/retry)
webhook_events (
  id, store_id, topic, payload, processed, error, 
  retry_count, created_at, processed_at
)

-- Notifications
notifications (
  id, user_id, type, title, message, read, metadata_json,
  created_at
)

-- Jobs (for retry queue - dev only)
failed_jobs (
  id, type, payload, error, retry_count, 
  created_at, last_attempted_at
)
```

---

## Day-by-Day Plan

### ✅ Day 1: Project Setup & Authentication Foundation

**Goal**: Bootable Next.js app with Supabase Google Auth working

#### Tasks
1. **Initialize Next.js project**
   ```bash
   npx create-next-app@latest storeboard --typescript --tailwind --eslint --app
   ```

2. **Install core dependencies**
   - `@supabase/supabase-js` (latest with publishable/secret key support)
   - `@supabase/ssr` (for server-side auth)
   - UI: `shadcn/ui` components (Button, Card, Input, Dialog, Toast, etc.)

3. **Environment setup**
   ```env
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   SUPABASE_SECRET_KEY=
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Supabase project setup**
   - Create Supabase project
   - Enable Google OAuth provider
   - Configure redirect URLs for localhost and dev.storeboard.app

5. **Auth implementation**
   - Create `/lib/supabase/client.ts` (browser client)
   - Create `/lib/supabase/server.ts` (server client)
   - Create `/lib/supabase/middleware.ts` (auth middleware)
   - Implement auth callback route `/app/auth/callback/route.ts`

6. **Create auth pages**
   - `/app/signin/page.tsx` - Sign in page with Google button
   - `/app/(authenticated)/layout.tsx` - Protected layout

#### Test Criteria
- [x] Can click "Sign in with Google" and complete OAuth flow
- [x] Redirected to `/dashboard` after successful auth
- [x] Unauthenticated users redirected to `/signin`
- [x] Can sign out successfully
- [x] Auth persists on page refresh

---

### ✅ Day 2: Database Schema & DAL Foundation

**Goal**: Database tables created, encryption working, basic DAL structure

#### Tasks
1. **Create Supabase migrations**
   - `stores` table
   - `orders` table  
   - `webhook_events` table
   - `notifications` table
   - `failed_jobs` table
   - Row Level Security (RLS) policies

2. **Encryption module** (`/data/encryption/`)
   - Install `crypto` utilities
   - Create `encrypt(plaintext)` and `decrypt(ciphertext)` functions
   - Use AES-256-GCM with per-record IV
   - Store encryption key in environment variable `ENCRYPTION_KEY`
   
   ```typescript
   // /data/encryption/credentials.ts
   export function encryptCredentials(data: object): string
   export function decryptCredentials(encrypted: string): object
   ```

3. **DAL structure**
   ```
   /data
     /database
       store.database.ts
       order.database.ts
       webhook-event.database.ts
       notification.database.ts
     /types
       store.types.ts
       order.types.ts
     /encryption
       credentials.ts
   ```

4. **Store database basics**
   - `createStore(userId, data)`
   - `getStoresByUserId(userId)`
   - `getStoreById(storeId, userId)` (with ownership check)
   - `updateStore(storeId, userId, data)`
   - `deleteStore(storeId, userId)`

#### Test Criteria
- [x] All tables created in Supabase
- [x] RLS policies prevent cross-user data access
- [x] Encryption/decryption roundtrip works
- [x] Can create a store via database layer (test script)
- [x] Can retrieve stores for a user

---

### ✅ Day 3: Store Management UI

**Goal**: Users can add/edit/delete stores with basic info (no integrations yet)

#### Tasks
1. **Dashboard layout**
   - `/app/(authenticated)/dashboard/page.tsx` - Main dashboard (summary view)
   - Navigation header with user menu
   - Store selector dropdown (for multi-store)

2. **Store list page**
   - `/app/(authenticated)/stores/page.tsx`
   - List all user's stores
   - "Add Store" button
   - Loading states with skeletons

3. **Add Store dialog/page**
   - `/app/(authenticated)/stores/new/page.tsx`
   - Form fields: Store name, Shopify domain
   - Form validation with `zod`
   - Server action to create store

4. **Edit Store page**
   - `/app/(authenticated)/stores/[storeId]/settings/page.tsx`
   - Edit store name, Shopify domain
   - Delete store (with confirmation)

5. **Optimistic UI patterns**
   - Use `useOptimistic` for store list updates
   - Loading states during mutations
   - Toast notifications for success/error

#### Test Criteria
- [x] Can view list of stores (empty state if none)
- [x] Can add a new store with name and Shopify domain
- [x] Can edit existing store
- [x] Can delete store with confirmation
- [x] Loading states show during operations
- [x] Toast shows on success/error

---

### ✅ Day 4: Shopify OAuth Integration

**Goal**: Complete Shopify OAuth flow to obtain access token

#### Tasks
1. **Shopify OAuth operation** (`/lib/integrations/shopify/oauth.ts`)
   - Generate OAuth authorization URL
   - Handle OAuth callback
   - Exchange code for access token
   - Store encrypted access token

2. **OAuth routes**
   - `/app/api/shopify/auth/route.ts` - Initiate OAuth (redirects to Shopify)
   - `/app/api/shopify/callback/route.ts` - Handle callback, store token

3. **Store settings - Shopify section**
   - Input fields for Client ID and Client Secret
   - "Connect to Shopify" button
   - Display connection status
   - Scopes: read_customers,read_fulfillments,write_fulfillments,read_orders,write_orders,read_products

4. **State management**
   - Use `state` parameter to prevent CSRF
   - Store pending OAuth in session/cookie

5. **Webhook registration** (prepare for Day 5)
   - After successful OAuth, register webhooks
   - Topics: `orders/create`, `orders/updated`, `orders/cancelled`, `fulfillments/create`, `fulfillments/update`, `app/uninstalled`

#### Test Criteria
- [x] Can enter Shopify Client ID and Secret
- [x] Click "Connect" redirects to Shopify OAuth
- [x] After approval, redirected back with access token stored
- [x] Store shows "Connected" status
- [x] Can disconnect (removes token)
- [x] Invalid credentials show error

---

### 🚧 Day 5: Shopify Webhooks Infrastructure

**Goal**: Receive and store Shopify webhooks, basic processing

#### Tasks
1. **Webhook endpoint**
   - `/app/api/webhooks/shopify/[storeId]/route.ts`
   - Verify HMAC signature
   - Store raw event in `webhook_events` table
   - Return 200 immediately (async processing)

2. **Webhook verification** (`/lib/integrations/shopify/webhook.ts`)
   - HMAC-SHA256 verification
   - Replay attack prevention (check for duplicate delivery IDs)

3. **Webhook registration on connect**
   - Register all webhook topics after OAuth success
   - Store webhook IDs for later management
   - Unregister on disconnect

4. **Webhook event database layer**
   - `createWebhookEvent(storeId, topic, payload)`
   - `getUnprocessedEvents(storeId)`
   - `markEventProcessed(eventId)`
   - `markEventFailed(eventId, error)`

5. **Basic event processor** (runs inline for now)
   - Switch on topic
   - For orders: upsert to orders table
   - For app/uninstalled: mark store disconnected

#### Test Criteria
- [ ] Webhook endpoint returns 200 for valid requests
- [ ] Invalid HMAC returns 401
- [ ] Events stored in `webhook_events` table
- [ ] Can see webhook events in Supabase dashboard
- [ ] Duplicate webhooks are ignored
- [ ] Test with Shopify webhook tester or ngrok

---

### Day 6: Order Sync & Display

**Goal**: Orders synced from webhooks displayed in unified list

#### Tasks
1. **Order database layer** (`/data/database/order.database.ts`)
   - `upsertOrderFromShopify(storeId, shopifyOrder)`
   - `getOrdersByUserId(userId, options)` - across all stores
   - `getOrdersByStoreId(storeId, options)`
   - `getOrderById(orderId)`
   - `updateOrderAwb(orderId, awbData)`
   - `updateOrderInvoice(orderId, invoiceData)`

2. **Order operations** (`/data/operations/order.operations.ts`)
   - Transform Shopify order to internal format
   - Extract essential fields only
   - Handle order updates (status changes)

3. **Order processing from webhooks**
   - Process `orders/create` → insert order
   - Process `orders/updated` → update order
   - Process `orders/cancelled` → mark cancelled

4. **Dashboard page** (summary)
   - `/app/(authenticated)/dashboard/page.tsx`
   - Quick stats: Total orders, Pending AWBs, Pending Invoices
   - Recent orders preview (last 5-10)
   - Quick actions

5. **Orders list page** (full list)
   - `/app/(authenticated)/orders/page.tsx`
   - Table with columns: Order #, Store, Customer, Total, Status, AWB, Invoice, Date
   - Store badge/indicator for multi-store view
   - Empty state

6. **Manual sync button**
   - "Sync Orders" button per store
   - Fetches last 50 orders from Shopify API
   - Upserts to database

#### Test Criteria
- [ ] Webhook creates order in database
- [ ] Order appears in orders list
- [ ] Dashboard shows summary stats
- [ ] Order updates reflected (status changes)
- [ ] Manual sync pulls orders from Shopify
- [ ] Orders from multiple stores show together
- [ ] Loading states during sync

---

### Day 7: Order Sidebar & Details

**Goal**: Click order to see details in sidebar panel

#### Tasks
1. **Order sidebar component**
   - `/components/orders/OrderSidebar.tsx`
   - Slides in from right
   - Shows full order details
   - Customer info, shipping address
   - Line items list
   - Order totals

2. **Sidebar state management**
   - URL-based state (`?orderId=xxx`)
   - Or React state with context
   - Close on outside click or X button

3. **Action buttons in sidebar**
   - "Generate AWB" button (disabled if already has AWB)
   - "Generate Invoice" button (disabled if already has invoice)
   - "View AWB PDF" (if exists)
   - "View Invoice PDF" (if exists)
   - "Sync from Shopify" (re-fetch this order)

4. **Status badges**
   - Financial status badge
   - Fulfillment status badge
   - AWB status badge
   - Invoice status badge

5. **Loading states**
   - Skeleton while loading order details
   - Button loading states

#### Test Criteria
- [ ] Click order row opens sidebar
- [ ] Sidebar shows correct order details
- [ ] All customer and line item info displays
- [ ] Action buttons show correct disabled states
- [ ] Can close sidebar
- [ ] URL updates when sidebar opens (optional)

---

### Day 8: Courier Provider Architecture & FanCourier Mock

**Goal**: Extensible courier system with FanCourier mock implementation

#### Tasks
1. **Courier base interface** (`/lib/integrations/couriers/base/`)
   ```typescript
   interface CourierProvider {
     name: string;
     generateAwb(order: Order, credentials: object): Promise<AwbResult>
     cancelAwb(awbNumber: string, credentials: object): Promise<void>
     getAwbStatus(awbNumber: string, credentials: object): Promise<AwbStatus>
     getAwbPdf(awbNumber: string, credentials: object): Promise<Buffer>
   }
   ```

2. **FanCourier implementation** (`/lib/integrations/couriers/fancourier/`)
   - Implement `CourierProvider` interface
   - Use `USE_MOCK_INTEGRATIONS` env var for mock mode
   - Mock: console.log payload, return fake AWB number
   - Map order data to FanCourier API format

3. **Courier factory**
   ```typescript
   function getCourierProvider(providerName: string): CourierProvider
   ```

4. **Store settings - Courier section**
   - Dropdown: Select courier provider (FanCourier, "Coming soon: Cargus")
   - FanCourier credentials: Username, Password, Client ID
   - Test connection button (mock: always success)

5. **AWB operations** (`/data/operations/awb.operations.ts`)
   - `generateAwbForOrder(orderId)`
   - Gets store credentials
   - Calls courier provider
   - Updates order with AWB info
   - Handles errors

#### Test Criteria
- [ ] Can select FanCourier as courier provider
- [ ] Can enter and save FanCourier credentials (encrypted)
- [ ] Generate AWB button calls operation
- [ ] Console shows mock payload in dev mode
- [ ] Order updated with mock AWB number
- [ ] Error handling shows toast on failure

---

### Day 9: Invoice Provider Architecture & SmartBill Mock

**Goal**: Extensible invoice system with SmartBill mock implementation

#### Tasks
1. **Invoice base interface** (`/lib/integrations/invoicing/base/`)
   ```typescript
   interface InvoiceProvider {
     name: string;
     generateInvoice(order: Order, credentials: object): Promise<InvoiceResult>
     voidInvoice(invoiceNumber: string, credentials: object): Promise<void>
     getInvoicePdf(invoiceNumber: string, credentials: object): Promise<Buffer>
   }
   ```

2. **SmartBill implementation** (`/lib/integrations/invoicing/smartbill/`)
   - Implement `InvoiceProvider` interface
   - Mock mode with console.log
   - Map order data to SmartBill API format

3. **Invoice factory**
   ```typescript
   function getInvoiceProvider(providerName: string): InvoiceProvider
   ```

4. **Store settings - Invoice section**
   - Dropdown: Select invoice provider (SmartBill)
   - SmartBill credentials: Email, API Token, Company VAT
   - Series name, warehouse (if needed)
   - Test connection button

5. **Invoice operations** (`/data/operations/invoice.operations.ts`)
   - `generateInvoiceForOrder(orderId)`
   - Gets store credentials
   - Calls invoice provider
   - Updates order with invoice info

#### Test Criteria
- [ ] Can select SmartBill as invoice provider
- [ ] Can enter and save SmartBill credentials (encrypted)
- [ ] Generate Invoice button calls operation
- [ ] Console shows mock payload
- [ ] Order updated with mock invoice number
- [ ] Error handling works

---

### Day 10: Real FanCourier API Integration

**Goal**: Replace FanCourier mock with real API calls

#### Tasks
1. **Research FanCourier API**
   - Latest API documentation
   - Authentication method
   - AWB generation endpoint
   - AWB cancellation endpoint
   - PDF download endpoint
   - Status tracking endpoint (or webhook setup)

2. **Implement real FanCourier client**
   - HTTP client with proper headers
   - Error handling and response parsing
   - Retry logic for transient failures
   - Rate limiting if needed

3. **AWB generation**
   - Map order to FanCourier payload
   - Handle COD (Cash on Delivery) amount
   - Package weight/dimensions (default values or config)

4. **AWB PDF download**
   - Download PDF from FanCourier
   - Store in Supabase Storage (or serve directly)
   - Return download URL

5. **FanCourier status tracking**
   - Check if webhooks available
   - If not, implement polling mechanism (cron job)
   - Or on-demand status check

6. **Toggle mock/real**
   - `USE_MOCK_INTEGRATIONS=false` uses real API
   - Keep mock for tests

#### Test Criteria
- [ ] Real AWB generated in FanCourier sandbox/test
- [ ] AWB number stored in database
- [ ] Can download AWB PDF
- [ ] Can cancel AWB
- [ ] Status updates work (poll or webhook)
- [ ] Error messages from API displayed properly

---

### Day 11: Real SmartBill API Integration

**Goal**: Replace SmartBill mock with real API calls

#### Tasks
1. **Research SmartBill API**
   - Latest API documentation
   - Authentication (API token)
   - Invoice creation endpoint
   - Invoice void/storno endpoint
   - PDF download endpoint

2. **Implement real SmartBill client**
   - HTTP client with auth header
   - Error handling
   - Retry logic

3. **Invoice generation**
   - Map order to SmartBill invoice format
   - Line items with quantities and prices
   - Customer details
   - Payment method (Cash on Delivery)

4. **Invoice PDF download**
   - Download from SmartBill
   - Store or serve directly

5. **Invoice void**
   - Implement void/storno for cancellations
   - Create reversal invoice

6. **Toggle mock/real**
   - Same env var controls

#### Test Criteria
- [ ] Real invoice created in SmartBill sandbox
- [ ] Invoice number stored in database
- [ ] Can download invoice PDF
- [ ] Can void invoice
- [ ] Line items match order
- [ ] Error handling works

---

### Day 12: Bulk Operations

**Goal**: Select multiple orders, generate AWBs/invoices in batch

#### Tasks
1. **Order selection UI**
   - Checkbox column in order table
   - "Select all" checkbox (visible page)
   - Selected count indicator
   - Bulk action bar appears when items selected

2. **Bulk action bar**
   - Shows: "X orders selected"
   - Buttons: "Generate AWBs", "Generate Invoices", "Generate Both"
   - "Clear selection" button

3. **Bulk AWB generation**
   - Process selected orders
   - Skip orders that already have AWB
   - Progress indicator
   - Summary of results (success/failed)

4. **Bulk Invoice generation**
   - Same pattern as AWB
   - Progress indicator
   - Results summary

5. **Background processing with Vercel**
   - For large batches, use background function
   - Show "Processing..." state
   - Polling for completion or optimistic update

6. **Error handling in bulk**
   - Continue on individual failures
   - Report which orders failed
   - Option to retry failed ones

#### Test Criteria
- [ ] Can select multiple orders
- [ ] Bulk action bar shows with count
- [ ] Bulk AWB generation processes all selected
- [ ] Progress shown during processing
- [ ] Summary shows success/failure count
- [ ] Failed orders can be identified

---

### Day 13: Order Cancellation Flow

**Goal**: Handle order cancellations - remove AWB and void invoice

#### Tasks
1. **Cancellation webhook processing**
   - Detect `orders/cancelled` webhook
   - Trigger cancellation flow

2. **AWB cancellation**
   - Call courier provider `cancelAwb`
   - Clear AWB fields on order
   - Handle "cannot cancel" errors (already shipped)

3. **Invoice void**
   - Call invoice provider `voidInvoice`
   - Store void/storno reference
   - Clear invoice fields on order

4. **Cancellation operations** (`/data/operations/cancellation.operations.ts`)
   - `handleOrderCancellation(orderId)`
   - Orchestrates AWB cancel + invoice void
   - Partial success handling

5. **Manual cancellation button**
   - In order sidebar: "Process Cancellation"
   - For orders marked as cancelled
   - If AWB/invoice exist, remove them

6. **UI feedback**
   - Show cancellation status
   - Indicate if AWB cancelled
   - Indicate if invoice voided

#### Test Criteria
- [ ] Cancelled order webhook triggers flow
- [ ] AWB cancelled in courier system
- [ ] Invoice voided in SmartBill
- [ ] Order record updated
- [ ] Manual cancellation button works
- [ ] Partial failure handled gracefully

---

### Day 14: PDF Downloads & Storage

**Goal**: Proper PDF handling for AWB labels and invoices

#### Tasks
1. **Supabase Storage setup**
   - Create bucket: `documents`
   - Folders: `awb-labels/`, `invoices/`
   - RLS policies for user access

2. **PDF storage operations** (`/data/operations/document.operations.ts`)
   - `storeAwbPdf(orderId, pdfBuffer)`
   - `storeInvoicePdf(orderId, pdfBuffer)`
   - Returns storage URL
   - File naming: `{storeId}/{orderId}-awb.pdf`

3. **PDF download endpoints**
   - `/app/api/orders/[orderId]/awb-pdf/route.ts`
   - `/app/api/orders/[orderId]/invoice-pdf/route.ts`
   - Verify user ownership
   - Stream PDF or redirect to signed URL

4. **Download buttons in UI**
   - "Download AWB" button
   - "Download Invoice" button
   - Open in new tab or download

5. **Bulk PDF download**
   - Download selected AWBs as ZIP
   - Download selected invoices as ZIP
   - Use `jszip` for client-side ZIP creation

#### Test Criteria
- [ ] AWB PDF stored in Supabase Storage
- [ ] Invoice PDF stored
- [ ] Can download AWB PDF
- [ ] Can download invoice PDF
- [ ] Only owner can access documents
- [ ] Bulk ZIP download works

---

### Day 15: Fulfillment Sync to Shopify

**Goal**: After AWB created, update Shopify fulfillment with tracking

#### Tasks
1. **Fulfillment operations** (`/data/operations/fulfillment.operations.ts`)
   - `createFulfillment(orderId)`
   - Creates fulfillment in Shopify with tracking
   - Updates local order status

2. **Shopify fulfillment API** (`/lib/integrations/shopify/fulfillment.ts`)
   - Create fulfillment
   - Add tracking info
   - Update fulfillment

3. **Auto-fulfill option**
   - After AWB generation, optionally create fulfillment
   - Store-level setting: auto-fulfill or manual
   - Toggle in store settings

4. **Tracking URL**
   - FanCourier tracking URL format
   - Store in fulfillment

5. **Fulfillment webhook handling**
   - Process `fulfillments/create`, `fulfillments/update`
   - Update local order fulfillment status
   - Avoid circular updates

6. **UI for fulfillment**
   - "Mark as Fulfilled" button
   - Show fulfillment status
   - Tracking link

#### Test Criteria
- [ ] AWB creation can trigger fulfillment
- [ ] Fulfillment appears in Shopify admin
- [ ] Tracking number/URL in Shopify
- [ ] Fulfillment status synced back
- [ ] Manual fulfill button works
- [ ] Auto-fulfill setting works

---

### Day 16: Reconciliation System

**Goal**: Handle missed webhooks, sync discrepancies

#### Tasks
1. **Manual order sync**
   - "Sync Orders" button fetches recent orders
   - Compares with local, upserts changes
   - Shows sync results

2. **Webhook replay**
   - View failed webhooks
   - "Retry" button reprocesses
   - Useful for dev debugging

3. **FanCourier status sync**
   - Cron job or manual trigger
   - Fetch delivery status for pending orders
   - Update local status

4. **Reconciliation dashboard** (simple)
   - `/app/(authenticated)/admin/reconciliation/page.tsx`
   - Shows: pending webhooks, failed webhooks
   - Sync buttons per store

5. **Missed order detection**
   - Compare Shopify order IDs with local
   - Flag orders only in Shopify
   - Bulk import missing

6. **Vercel Cron setup**
   - `/app/api/cron/reconcile/route.ts`
   - Runs daily (or hourly)
   - Syncs delivery statuses
   - Checks for missed orders

#### Test Criteria
- [ ] Manual sync fetches and updates orders
- [ ] Failed webhook retry works
- [ ] Cron job runs on schedule
- [ ] Delivery statuses updated
- [ ] Missing orders detected and imported
- [ ] Reconciliation page shows status

---

### Day 17: Notifications System

**Goal**: In-app notifications panel for errors and alerts

#### Tasks
1. **Notification database layer** (`/data/database/notification.database.ts`)
   - `createNotification(userId, data)`
   - `getNotifications(userId, unreadOnly)`
   - `markAsRead(notificationId)`
   - `markAllAsRead(userId)`

2. **Notification types**
   ```typescript
   type NotificationType = 
     | 'webhook_failed'
     | 'credential_expiring'
     | 'app_uninstalled'
     | 'sync_failed'
     | 'awb_failed'
     | 'invoice_failed'
   ```

3. **Notification bell in header**
   - Bell icon with unread count badge
   - Click opens dropdown panel
   - Shows recent notifications
   - "Mark all as read" link

4. **Notification panel component**
   - `/components/notifications/NotificationPanel.tsx`
   - Dropdown/popover from header icon
   - List of notifications with timestamps
   - Click notification to navigate to relevant page
   - Scrollable with max height

5. **Notification triggers**
   - Webhook processing failure → notification
   - App uninstalled → notification
   - Credential check (cron) → notification if expiring

6. **Credential expiration check**
   - Cron job checks token validity
   - FanCourier/SmartBill API test call
   - Create notification if failing

#### Test Criteria
- [ ] Notification bell shows unread count
- [ ] Click bell opens panel dropdown
- [ ] Panel shows recent notifications
- [ ] Click marks notification as read
- [ ] Failed webhook creates notification
- [ ] Credential warning notification works

---

### Day 18: Error Handling & Retry System

**Goal**: Robust error handling, retry queue for dev

#### Tasks
1. **Error boundary components**
   - Global error boundary
   - Per-component error boundaries
   - Fallback UI

2. **API error handling**
   - Consistent error response format
   - Error logging
   - User-friendly messages

3. **Failed jobs table**
   - Store failed operations
   - Job type, payload, error, retry count
   - Last attempted timestamp

4. **Failed jobs page** (dev only)
   - `/app/(authenticated)/admin/failed-jobs/page.tsx`
   - List failed jobs
   - "Retry" button
   - "Delete" button

5. **Retry logic in operations**
   - Exponential backoff
   - Max retry count
   - On final failure, create notification

6. **Integration retry handling**
   - FanCourier API retry on timeout
   - SmartBill API retry
   - Webhook processing retry

#### Test Criteria
- [ ] API errors return consistent format
- [ ] Error boundaries catch React errors
- [ ] Failed jobs recorded in database
- [ ] Can view failed jobs (dev mode)
- [ ] Retry button re-executes job
- [ ] Retry logic with backoff works

---

### Day 19: Loading States & Optimistic UI

**Goal**: Polish all loading states and optimistic updates

#### Tasks
1. **Loading skeletons audit**
   - Order list skeleton
   - Order sidebar skeleton
   - Store list skeleton
   - Settings form skeleton

2. **Button loading states**
   - All action buttons show spinner
   - Disabled during loading
   - Proper loading indicators

3. **Optimistic updates**
   - AWB generation: show pending state immediately
   - Invoice generation: same
   - Order selection: instant UI feedback

4. **Error recovery UI**
   - Toast notifications for errors
   - Retry options where applicable
   - Clear error states

5. **Progressive loading**
   - Streaming where possible
   - Suspense boundaries
   - Parallel data fetching

6. **Empty states**
   - No stores yet
   - No orders yet
   - No notifications

#### Test Criteria
- [ ] All lists show skeletons while loading
- [ ] Buttons show loading state
- [ ] Optimistic updates feel instant
- [ ] Errors show toast with retry
- [ ] Empty states are helpful
- [ ] No layout shift during loading

---

### Day 20: Testing & Documentation

**Goal**: Manual test scripts, final polish, documentation

#### Tasks
1. **Manual test checklist**
   - Document all test scenarios
   - Step-by-step test scripts
   - Expected results

2. **Test data setup**
   - Script to create test stores
   - Mock Shopify orders
   - Reset test data script

3. **Environment documentation**
   - All env vars documented
   - Setup instructions
   - Supabase configuration

4. **API documentation**
   - Internal API routes
   - Webhook endpoints
   - Cron jobs

5. **Deployment checklist**
   - Vercel project setup
   - Environment variables
   - Domain configuration
   - Supabase production setup

6. **README**
   - Project overview
   - Local development setup
   - Deployment instructions
   - Architecture overview

#### Test Criteria
- [ ] All features tested manually
- [ ] Test scripts documented
- [ ] README complete
- [ ] Can deploy to Vercel
- [ ] Production environment works
- [ ] Domain configured

---

### Day 21: Production Deployment & Polish

**Goal**: Deploy to production, final fixes

#### Tasks
1. **Vercel deployment**
   - Connect GitHub repo
   - Configure environment variables
   - Set up domain (dev.storeboard.app initially)

2. **Production Supabase**
   - Create production project (or use existing)
   - Run migrations
   - Configure auth redirect URLs

3. **Google OAuth production**
   - Add production redirect URI
   - Verify app if needed

4. **Shopify app configuration**
   - Production webhook URLs
   - OAuth callback URLs

5. **Monitoring setup**
   - Vercel analytics
   - Error tracking (Sentry optional)
   - Log review

6. **Final testing**
   - Full flow in production
   - Real Shopify store connection
   - Real AWB/invoice generation

#### Test Criteria
- [ ] App accessible at dev.storeboard.app
- [ ] Auth flow works in production
- [ ] Can connect real Shopify store
- [ ] Webhooks received
- [ ] AWB generation works
- [ ] Invoice generation works

---

## Environment Variables Reference

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or https://dev.storeboard.app
ENCRYPTION_KEY=  # 32-byte hex string for AES-256

# Feature Flags
USE_MOCK_INTEGRATIONS=true  # Set to false for real API calls

# FanCourier (if needed at app level)
FANCOURIER_API_URL=https://api.fancourier.ro

# SmartBill (if needed at app level)
SMARTBILL_API_URL=https://ws.smartbill.ro/SBORO/api
```

---

## File Structure Overview

```
/storeboard
├── /app
│   ├── /api
│   │   ├── /auth/callback/route.ts
│   │   ├── /shopify
│   │   │   ├── /auth/route.ts
│   │   │   └── /callback/route.ts
│   │   ├── /webhooks/shopify/[storeId]/route.ts
│   │   ├── /orders/[orderId]
│   │   │   ├── /awb-pdf/route.ts
│   │   │   └── /invoice-pdf/route.ts
│   │   └── /cron
│   │       └── /reconcile/route.ts
│   ├── /(authenticated)
│   │   ├── layout.tsx
│   │   ├── /dashboard/page.tsx
│   │   ├── /orders/page.tsx
│   │   ├── /stores
│   │   │   ├── page.tsx
│   │   │   ├── /new/page.tsx
│   │   │   └── /[storeId]/settings/page.tsx
│   │   └── /admin
│   │       ├── /reconciliation/page.tsx
│   │       └── /failed-jobs/page.tsx
│   ├── /signin/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── /components
│   ├── /ui (shadcn components)
│   ├── /orders
│   │   ├── OrderTable.tsx
│   │   ├── OrderSidebar.tsx
│   │   ├── OrderRow.tsx
│   │   └── BulkActionBar.tsx
│   ├── /stores
│   │   ├── StoreCard.tsx
│   │   ├── StoreForm.tsx
│   │   └── ShopifyConnectButton.tsx
│   ├── /notifications
│   │   ├── NotificationBell.tsx
│   │   └── NotificationPanel.tsx
│   └── /layout
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── UserMenu.tsx
├── /data
│   ├── /database
│   │   ├── store.database.ts
│   │   ├── order.database.ts
│   │   ├── webhook-event.database.ts
│   │   └── notification.database.ts
│   ├── /operations
│   │   ├── store.operations.ts
│   │   ├── order.operations.ts
│   │   ├── awb.operations.ts
│   │   ├── invoice.operations.ts
│   │   ├── fulfillment.operations.ts
│   │   ├── cancellation.operations.ts
│   │   ├── document.operations.ts
│   │   └── notification.operations.ts
│   ├── /types
│   │   ├── store.types.ts
│   │   ├── order.types.ts
│   │   ├── courier.types.ts
│   │   └── invoice.types.ts
│   └── /encryption
│       └── credentials.ts
├── /lib
│   ├── /supabase
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── /integrations
│   │   ├── /shopify
│   │   │   ├── oauth.ts
│   │   │   ├── api.ts
│   │   │   ├── webhook.ts
│   │   │   └── fulfillment.ts
│   │   ├── /couriers
│   │   │   ├── /base
│   │   │   │   └── types.ts
│   │   │   ├── /fancourier
│   │   │   │   ├── client.ts
│   │   │   │   ├── mock.ts
│   │   │   │   └── index.ts
│   │   │   └── factory.ts
│   │   └── /invoicing
│   │       ├── /base
│   │       │   └── types.ts
│   │       ├── /smartbill
│   │       │   ├── client.ts
│   │       │   ├── mock.ts
│   │       │   └── index.ts
│   │       └── factory.ts
│   └── /utils
│       ├── errors.ts
│       └── format.ts
├── /supabase
│   └── /migrations
│       ├── 001_create_stores.sql
│       ├── 002_create_orders.sql
│       ├── 003_create_webhook_events.sql
│       ├── 004_create_notifications.sql
│       └── 005_create_failed_jobs.sql
├── .env.local
├── .env.example
├── middleware.ts
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```

---

## Daily Testing Checklist Template

Each day, before moving to the next:

- [ ] All new features work in browser
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Loading states work
- [ ] Error states work
- [ ] Data persists correctly
- [ ] Auth still works
- [ ] Previous features still work

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Shopify API changes | Pin to 2025-10 version, monitor deprecations |
| FanCourier API issues | Mock mode fallback, detailed error logging |
| SmartBill API issues | Mock mode fallback, error notifications |
| Webhook reliability | Reconciliation system, manual sync |
| Credential security | AES-256 encryption, environment secrets |
| Scale issues | Vercel serverless, Supabase handles DB |

---

## Success Metrics

By end of Day 21:
- [ ] User can sign in with Google
- [ ] User can add multiple stores
- [ ] User can connect Shopify stores
- [ ] Orders sync via webhooks
- [ ] User can generate AWBs (bulk and single)
- [ ] User can generate invoices (bulk and single)
- [ ] User can download PDF labels and invoices
- [ ] Order fulfillment syncs to Shopify
- [ ] Cancellations handled properly
- [ ] Notifications panel shows errors
- [ ] App deployed to production
