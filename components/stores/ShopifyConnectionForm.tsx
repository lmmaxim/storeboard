'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Store } from '@/data/types/store.types'

const shopifyCredentialsSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
})

type ShopifyCredentialsFormData = z.infer<typeof shopifyCredentialsSchema>

interface ShopifyConnectionFormProps {
  store: Store
}

export function ShopifyConnectionForm({ store }: ShopifyConnectionFormProps) {
  const router = useRouter()
  const [isConnecting, setIsConnecting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShopifyCredentialsFormData>({
    resolver: zodResolver(shopifyCredentialsSchema),
  })

  const handleConnect = async (data: ShopifyCredentialsFormData) => {
    setIsConnecting(true)
    // Redirect to OAuth initiation endpoint
    const params = new URLSearchParams({
      storeId: store.id,
      clientId: data.clientId,
      clientSecret: data.clientSecret,
    })
    
    window.location.href = `/api/shopify/auth?${params.toString()}`
  }

  return (
    <form onSubmit={handleSubmit(handleConnect)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="clientId">Shopify Client ID</Label>
        <Input
          id="clientId"
          type="text"
          {...register('clientId')}
          placeholder="Your Shopify app Client ID"
          disabled={isConnecting || !!store.shopify_access_token_encrypted}
        />
        {errors.clientId && (
          <p className="text-sm text-red-500">{errors.clientId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientSecret">Shopify Client Secret</Label>
        <Input
          id="clientSecret"
          type="password"
          {...register('clientSecret')}
          placeholder="Your Shopify app Client Secret"
          disabled={isConnecting || !!store.shopify_access_token_encrypted}
        />
        {errors.clientSecret && (
          <p className="text-sm text-red-500">{errors.clientSecret.message}</p>
        )}
        <p className="text-xs text-zinc-500">
          Get these from your Shopify app settings in the Partner Dashboard
        </p>
      </div>

      {!store.shopify_access_token_encrypted && (
        <Button type="submit" disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect to Shopify'}
        </Button>
      )}
    </form>
  )
}

