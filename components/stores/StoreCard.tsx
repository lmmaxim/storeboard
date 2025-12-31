import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Store } from 'lucide-react'
import type { Store as StoreType } from '@/data/types/store.types'

interface StoreCardProps {
  store: StoreType
}

export function StoreCard({ store }: StoreCardProps) {
  const isConnected = !!store.shopify_access_token_encrypted

  return (
    <Link href={`/stores/${store.id}/settings`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                <Store className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <CardTitle className="text-lg">{store.name}</CardTitle>
                <CardDescription className="mt-1">
                  {store.shopify_domain}
                </CardDescription>
              </div>
            </div>
            {isConnected ? (
              <Badge variant="default" className="bg-green-500">
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">Not Connected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Created {new Date(store.created_at).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

