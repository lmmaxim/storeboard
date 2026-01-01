import { getStoresOperation } from '@/data/operations/store.operations'
import { createClient } from '@/lib/supabase/server'
import { StoreCard } from '@/components/stores/StoreCard'
import { Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConnectStoreModal } from '@/components/stores/ConnectStoreModal'
import { StoresListClient } from './StoresListClient'

export async function StoresList() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const stores = await getStoresOperation(user.id)

  return <StoresListClient initialStores={stores} />
}
