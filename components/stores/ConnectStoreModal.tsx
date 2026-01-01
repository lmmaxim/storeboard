'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { connectStoreAction } from '@/app/(authenticated)/stores/actions'

const connectStoreSchema = z.object({
  name: z.string().min(1, 'Store name is required').max(100, 'Store name is too long'),
  shopify_domain: z
    .string()
    .min(1, 'Shopify domain is required')
    .regex(/^[a-zA-Z0-9-]+$/, 'Invalid Shopify domain format (e.g., your-store)'),
  client_id: z
    .string()
    .min(1, 'Client ID is required')
    .regex(/^[a-f0-9]{32}$/i, 'Client ID must be a 32-character hexadecimal string'),
  client_secret: z
    .string()
    .min(1, 'Client Secret is required')
    .regex(/^shpss_[a-f0-9]{32}$/i, 'Client Secret must start with shpss_ followed by a hexadecimal string'),
})

type ConnectStoreFormData = z.infer<typeof connectStoreSchema>

interface ConnectStoreModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectStoreModal({ open, onOpenChange }: ConnectStoreModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<ConnectStoreFormData>({
    resolver: zodResolver(connectStoreSchema),
    mode: 'onChange',
  })

  const handleFormSubmit = async (data: ConnectStoreFormData) => {
    setIsSubmitting(true)
    try {
      const result = await connectStoreAction({
        name: data.name,
        shopify_domain: `${data.shopify_domain}.myshopify.com`,
        client_id: data.client_id,
        client_secret: data.client_secret,
      })

      if (result.success && result.oauthUrl && result.store) {
        // Redirect through API route to set cookies
        const connectUrl = `/api/shopify/connect?storeId=${result.store.id}&state=${encodeURIComponent(result.state || '')}&oauthUrl=${encodeURIComponent(result.oauthUrl)}`
        window.location.href = connectUrl
        // Don't close modal or reset yet - let OAuth callback handle it
      } else {
        toast.error(result.error || 'Invalid credentials. Please check your Client ID and Secret.', {
          duration: 4000,
        })
        setIsSubmitting(false)
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Invalid credentials. Please check your Client ID and Secret.',
        {
          duration: 4000,
        }
      )
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (!isSubmitting) {
      reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connect Shopify Store</DialogTitle>
          <DialogDescription>Enter your store details and API credentials</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Store Name</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="My Awesome Store"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopify_domain">Shopify Domain</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="shopify_domain"
                  {...register('shopify_domain')}
                  placeholder="your-store"
                  disabled={isSubmitting}
                  className="flex-1"
                />
                <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                  .myshopify.com
                </div>
              </div>
              {errors.shopify_domain && (
                <p className="text-sm text-red-500">{errors.shopify_domain.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">API Credentials</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Client ID</Label>
              <Input
                id="client_id"
                {...register('client_id')}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                disabled={isSubmitting}
                className="font-mono text-sm"
              />
              {errors.client_id && (
                <p className="text-sm text-red-500">{errors.client_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_secret">Client Secret</Label>
              <Input
                id="client_secret"
                type="password"
                {...register('client_secret')}
                placeholder="shpss_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                disabled={isSubmitting}
                className="font-mono text-sm"
              />
              {errors.client_secret && (
                <p className="text-sm text-red-500">{errors.client_secret.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Get these from your{' '}
                <a
                  href="https://partners.shopify.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  Shopify Partner Dashboard
                </a>{' '}
                → Apps → Your App → API credentials
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Store'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

