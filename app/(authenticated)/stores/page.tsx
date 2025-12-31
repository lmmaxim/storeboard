import { createClient } from '@/lib/supabase/server'
import { getStoresOperation } from '@/data/operations/store.operations'
import { Header } from '@/components/layout/Header'
import { StoreCard } from '@/components/stores/StoreCard'
import { ToastHandler } from '@/components/stores/ToastHandler'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Store } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

async function StoresList() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const stores = await getStoresOperation(user.id)

  if (stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white p-12 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
          <Store className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          No stores yet
        </h3>
        <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Get started by adding your first Shopify store
        </p>
        <Link href="/stores/new" className="mt-6">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Store
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stores.map((store) => (
        <StoreCard key={store.id} store={store} />
      ))}
    </div>
  )
}

function StoresListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

export default async function StoresPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header userEmail={user?.email ?? null} />
      <Suspense fallback={null}>
        <ToastHandler />
      </Suspense>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Stores
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Manage your Shopify stores
            </p>
          </div>
          <Link href="/stores/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Store
            </Button>
          </Link>
        </div>
        <Suspense fallback={<StoresListSkeleton />}>
          <StoresList />
        </Suspense>
      </main>
    </div>
  )
}

