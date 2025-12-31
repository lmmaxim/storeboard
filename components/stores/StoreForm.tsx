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

const storeSchema = z.object({
  name: z.string().min(1, 'Store name is required').max(100, 'Store name is too long'),
  shopify_domain: z
    .string()
    .min(1, 'Shopify domain is required')
    .regex(/^[a-zA-Z0-9-]+\.myshopify\.com$/, 'Invalid Shopify domain format (e.g., store.myshopify.com)'),
})

type StoreFormData = z.infer<typeof storeSchema>

interface StoreFormProps {
  store?: Store
  onSubmit: (data: StoreFormData) => Promise<{ success: boolean }>
  onCancel?: () => void
  redirectTo?: string
}

export function StoreForm({ store, onSubmit, onCancel, redirectTo }: StoreFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: store
      ? {
          name: store.name,
          shopify_domain: store.shopify_domain,
        }
      : undefined,
  })

  const handleFormSubmit = async (data: StoreFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      if (redirectTo) {
        // Add success message as query param so it shows on the destination page
        const message = store ? 'Store updated successfully' : 'Store created successfully'
        router.push(`${redirectTo}?success=${encodeURIComponent(message)}`)
      } else {
        // If no redirect, show toast immediately
        toast.success(store ? 'Store updated successfully' : 'Store created successfully')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Store Name</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="My Store"
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="shopify_domain">Shopify Domain</Label>
        <Input
          id="shopify_domain"
          {...register('shopify_domain')}
          placeholder="store.myshopify.com"
          disabled={isSubmitting}
        />
        {errors.shopify_domain && (
          <p className="text-sm text-red-500">{errors.shopify_domain.message}</p>
        )}
        <p className="text-xs text-zinc-500">
          Enter your Shopify store domain (e.g., store.myshopify.com)
        </p>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : store ? 'Update Store' : 'Create Store'}
        </Button>
      </div>
    </form>
  )
}

