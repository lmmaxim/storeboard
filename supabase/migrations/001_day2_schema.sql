-- Day 2: Database Schema & DAL Foundation
create extension if not exists "pgcrypto";

-- Stores
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  shopify_domain text not null,
  shopify_client_id_encrypted text,
  shopify_client_secret_encrypted text,
  shopify_access_token_encrypted text,
  shopify_scopes text[] default '{}'::text[],
  courier_provider text default 'fancourier',
  courier_credentials_encrypted text,
  invoice_provider text default 'smartbill',
  invoice_credentials_encrypted text,
  webhook_secret text,
  auto_fulfill boolean default false,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  shopify_order_id text not null,
  shopify_order_number text not null,
  customer_name text,
  customer_email text,
  customer_phone text,
  shipping_address jsonb,
  line_items jsonb,
  total_price numeric(10, 2),
  currency text default 'RON',
  financial_status text,
  fulfillment_status text,
  cancelled_at timestamptz,
  awb_number text,
  awb_created_at timestamptz,
  awb_pdf_url text,
  invoice_number text,
  invoice_created_at timestamptz,
  invoice_pdf_url text,
  shopify_created_at timestamptz,
  synced_at timestamptz default timezone('utc', now()),
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now()),
  unique (store_id, shopify_order_id)
);

-- Webhook Events
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  topic text not null,
  shopify_webhook_id text,
  payload jsonb not null,
  processed boolean default false,
  error text,
  retry_count integer default 0,
  created_at timestamptz default timezone('utc', now()),
  processed_at timestamptz
);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  read boolean default false,
  metadata jsonb,
  created_at timestamptz default timezone('utc', now())
);

-- Failed Jobs
create table if not exists public.failed_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null,
  error text not null,
  retry_count integer default 0,
  created_at timestamptz default timezone('utc', now()),
  last_attempted_at timestamptz
);

-- Indexes
create index if not exists idx_orders_store on public.orders (store_id);
create index if not exists idx_webhook_events_store on public.webhook_events (store_id);
create index if not exists idx_notifications_user on public.notifications (user_id);
create unique index if not exists idx_webhook_events_delivery on public.webhook_events (store_id, shopify_webhook_id) where shopify_webhook_id is not null;

-- Row Level Security
alter table public.stores enable row level security;
alter table public.orders enable row level security;
alter table public.webhook_events enable row level security;
alter table public.notifications enable row level security;
alter table public.failed_jobs enable row level security;

-- Stores policies
create policy "Users can select own stores" on public.stores
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own stores" on public.stores
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own stores" on public.stores
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own stores" on public.stores
  for delete
  using (auth.uid() = user_id);

-- Orders policies
create policy "Users can select orders for own stores" on public.orders
  for select
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.user_id = auth.uid()
    )
  );

create policy "Users can insert orders for own stores" on public.orders
  for insert
  with check (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.user_id = auth.uid()
    )
  );

create policy "Users can update orders for own stores" on public.orders
  for update
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.user_id = auth.uid()
    )
  );

create policy "Users can delete orders for own stores" on public.orders
  for delete
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.user_id = auth.uid()
    )
  );

create policy "Service role manages orders" on public.orders
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Webhook event policies
create policy "Users can select webhook events for own stores" on public.webhook_events
  for select
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.user_id = auth.uid()
    )
  );

create policy "Service role inserts webhook events" on public.webhook_events
  for insert
  with check (auth.role() = 'service_role');

create policy "Service role updates webhook events" on public.webhook_events
  for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Notifications policies
create policy "Users can select own notifications" on public.notifications
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own notifications" on public.notifications
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notifications" on public.notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own notifications" on public.notifications
  for delete
  using (auth.uid() = user_id);

create policy "Service role inserts notifications" on public.notifications
  for insert
  with check (auth.role() = 'service_role');

-- Failed jobs policies
create policy "Service role manages failed jobs" on public.failed_jobs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

