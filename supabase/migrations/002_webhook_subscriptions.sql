-- Day 5: Webhook Subscriptions Table
-- Store webhook subscription IDs for audit and cleanup

create table if not exists public.shopify_webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  shopify_webhook_id text not null,
  topic text not null,
  webhook_url text not null,
  created_at timestamptz default timezone('utc', now()),
  unique (store_id, shopify_webhook_id)
);

-- Indexes
create index if not exists idx_webhook_subscriptions_store on public.shopify_webhook_subscriptions (store_id);
create index if not exists idx_webhook_subscriptions_topic on public.shopify_webhook_subscriptions (topic);

-- Row Level Security
alter table public.shopify_webhook_subscriptions enable row level security;

-- Users can view subscriptions for their stores
create policy "Users can select webhook subscriptions for own stores" on public.shopify_webhook_subscriptions
  for select
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.user_id = auth.uid()
    )
  );

-- Service role manages subscriptions
create policy "Service role manages webhook subscriptions" on public.shopify_webhook_subscriptions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

