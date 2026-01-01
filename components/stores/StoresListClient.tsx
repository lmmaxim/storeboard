'use client'

import { useState } from 'react'
import { StoreCard } from '@/components/stores/StoreCard'
import { ConnectStoreModal } from '@/components/stores/ConnectStoreModal'
import { Button } from '@/components/ui/button'
import { Plus, Store } from 'lucide-react'
import type { Store as StoreType } from '@/data/types/store.types'

interface StoresListClientProps {
  initialStores: StoreType[]
}

export function StoresListClient({ initialStores }: StoresListClientProps) {
  const [modalOpen, setModalOpen] = useState(false)

  if (initialStores.length === 0) {
    return (
      <>
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
          <Button onClick={() => setModalOpen(true)} className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Add Store
          </Button>
        </div>
        <ConnectStoreModal open={modalOpen} onOpenChange={setModalOpen} />
      </>
    )
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Store
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {initialStores.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
      <ConnectStoreModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}

