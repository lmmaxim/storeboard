import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function OrdersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header userEmail={user.email ?? null} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Orders
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            View and manage your orders
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>
              Orders will appear here once you connect a Shopify store and start receiving orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              This feature will be available in a future update.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

