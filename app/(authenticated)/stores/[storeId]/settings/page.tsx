import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { StoreForm } from '@/components/stores/StoreForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getStoreOperation } from '@/data/operations/store.operations'
import { updateStoreAction, deleteStoreAction } from '../../actions'
import { DeleteStoreButton } from '@/components/stores/DeleteStoreButton'

interface StoreSettingsPageProps {
  params: Promise<{ storeId: string }>
}

export default async function StoreSettingsPage({ params }: StoreSettingsPageProps) {
  const { storeId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  const store = await getStoreOperation(storeId, user.id)

  if (!store) {
    redirect('/stores')
  }

  async function handleSubmit(data: { name: string; shopify_domain: string }) {
    'use server'
    return await updateStoreAction(storeId, data)
  }

  async function handleDelete() {
    'use server'
    return await deleteStoreAction(storeId)
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header userEmail={user.email ?? null} />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Store Settings
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Manage your store information
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>
                Update your store name and Shopify domain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StoreForm store={store} onSubmit={handleSubmit} redirectTo="/stores" />
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">
                Danger Zone
              </CardTitle>
              <CardDescription>
                Permanently delete this store. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeleteStoreButton storeId={storeId} storeName={store.name} onDelete={handleDelete} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

