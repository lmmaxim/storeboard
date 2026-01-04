import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { getOrdersOperation } from '@/data/operations/order.operations'
import { getStoresOperation } from '@/data/operations/store.operations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function OrdersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  const orders = await getOrdersOperation(user.id)
  const stores = await getStoresOperation(user.id)

  // Create a map of store IDs to store names for quick lookup
  const storeMap = new Map(stores.map((store) => [store.id, store.name]))

  const getStoreName = (storeId: string) => storeMap.get(storeId) || 'Unknown Store'

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">N/A</Badge>
    
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      paid: { label: 'Paid', variant: 'default' },
      pending: { label: 'Pending', variant: 'secondary' },
      refunded: { label: 'Refunded', variant: 'outline' },
      voided: { label: 'Voided', variant: 'outline' },
      fulfilled: { label: 'Fulfilled', variant: 'default' },
      partial: { label: 'Partial', variant: 'secondary' },
      unfulfilled: { label: 'Unfulfilled', variant: 'outline' },
    }

    const statusConfig = statusMap[status.toLowerCase()] || { label: status, variant: 'outline' as const }
    
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
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
            View and manage your orders across all stores
          </p>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Orders Yet</CardTitle>
              <CardDescription>
                Orders will appear here once you connect a Shopify store and start receiving orders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Connect a store and wait for orders to sync via webhooks, or use the manual sync button on the stores page.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Orders ({orders.length})</CardTitle>
              <CardDescription>
                Orders from all connected stores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>AWB</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900">
                      <TableCell className="font-medium">
                        #{order.shopify_order_number}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getStoreName(order.store_id)}</Badge>
                      </TableCell>
                      <TableCell>
                        {order.customer_name || 'Guest'}
                      </TableCell>
                      <TableCell>
                        {order.total_price
                          ? `${order.total_price} ${order.currency}`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(order.financial_status)}
                          {order.fulfillment_status && getStatusBadge(order.fulfillment_status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.awb_number ? (
                          <Badge variant="default">{order.awb_number}</Badge>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-600">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.invoice_number ? (
                          <Badge variant="default">{order.invoice_number}</Badge>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-600">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.shopify_created_at
                          ? new Date(order.shopify_created_at).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
