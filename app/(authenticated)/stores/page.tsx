import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { StoresList } from '@/components/stores/StoresList'
import { StoresListSkeleton } from '@/components/stores/StoresListSkeleton'
import { StoresToastHandler } from '@/components/stores/StoresToastHandler'
import { Suspense } from 'react'

export default async function StoresPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header userEmail={user?.email ?? null} />
      <StoresToastHandler />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Stores
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage your Shopify stores
          </p>
        </div>
        <Suspense fallback={<StoresListSkeleton />}>
          <StoresList />
        </Suspense>
      </main>
    </div>
  )
}
