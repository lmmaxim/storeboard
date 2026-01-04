import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { getStoresOperation } from '@/data/operations/store.operations'
import { getOrderStatsOperation, getOrdersOperation } from '@/data/operations/order.operations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Store, Package, FileText, Truck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  const stores = await getStoresOperation(user.id)
  const stats = await getOrderStatsOperation(user.id)
  const recentOrders = await getOrdersOperation(user.id, { limit: 10 })

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header userEmail={user.email ?? null} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Welcome to Storeboard! Your order management dashboard.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stores</CardTitle>
                <Store className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stores.length}</div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Connected stores
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
                <Package className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Total orders
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending AWBs</CardTitle>
                <Truck className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingAwbs}</div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Awaiting AWB generation
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                <FileText className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Awaiting invoice generation
                </p>
              </CardContent>
            </Card>
          </div>

          {stores.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Get Started</CardTitle>
                <CardDescription>
                  Add your first Shopify store to start managing orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/stores">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Store
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Manage your stores and view orders
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Link href="/stores">
                    <Button variant="outline">
                      <Store className="mr-2 h-4 w-4" />
                      View Stores
                    </Button>
                  </Link>
                  <Link href="/orders">
                    <Button variant="outline">
                      <Package className="mr-2 h-4 w-4" />
                      View Orders
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {recentOrders.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>
                      Latest orders from your stores
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentOrders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between border-b border-zinc-200 pb-4 last:border-0 last:pb-0 dark:border-zinc-800"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                Order #{order.shopify_order_number}
                              </span>
                              <Badge variant="outline">
                                {stores.find((s) => s.id === order.store_id)?.name || 'Unknown Store'}
                              </Badge>
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {order.customer_name || 'Guest'} • {order.total_price ? `${order.total_price} ${order.currency}` : 'N/A'}
                            </p>
                            {order.shopify_created_at && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                                {new Date(order.shopify_created_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <Link href={`/orders?orderId=${order.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <Link href="/orders">
                        <Button variant="outline" className="w-full">
                          View All Orders
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

