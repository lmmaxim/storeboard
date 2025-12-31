import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { StoreForm } from '@/components/stores/StoreForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createStoreAction } from '../actions'

export default async function NewStorePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  async function handleSubmit(data: { name: string; shopify_domain: string }) {
    'use server'
    return await createStoreAction(data)
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header userEmail={user.email ?? null} />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Add New Store
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Connect your Shopify store to get started
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
            <CardDescription>
              Enter your store details. You can connect Shopify later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StoreForm onSubmit={handleSubmit} redirectTo="/stores" />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

