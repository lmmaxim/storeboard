'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Store } from '@/data/types/store.types'

interface ShopifyConnectionStatusProps {
  store: Store
  onDisconnect: () => Promise<void>
}

export function ShopifyConnectionStatus({
  store,
  onDisconnect,
}: ShopifyConnectionStatusProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const isConnected = !!store.shopify_access_token_encrypted
  const scopes = store.shopify_scopes || []

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from Shopify? This will remove all credentials.')) {
      return
    }

    setIsDisconnecting(true)
    try {
      await onDisconnect()
      toast.success('Disconnected from Shopify')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect')
      setIsDisconnecting(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Not connected to Shopify. Enter your Client ID and Secret to connect.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="default" className="bg-green-500 text-white">
          Connected
        </Badge>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Successfully connected to {store.shopify_domain}
        </span>
      </div>

      {scopes.length > 0 && (
        <div>
          <Label className="text-sm font-medium">Authorized Scopes</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {scopes.map((scope) => (
              <Badge key={scope} variant="outline" className="text-xs">
                {scope}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="destructive"
        onClick={handleDisconnect}
        disabled={isDisconnecting}
      >
        {isDisconnecting ? 'Disconnecting...' : 'Disconnect from Shopify'}
      </Button>
    </div>
  )
}

