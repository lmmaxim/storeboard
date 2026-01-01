'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function StoresToastHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success) {
      toast.success(success === 'connected' ? 'Store connected successfully!' : decodeURIComponent(success), {
        duration: 4000,
      })
      // Clear query params
      router.replace('/stores')
    }

    if (error) {
      let errorMessage = 'An error occurred'
      
      switch (error) {
        case 'invalid_state':
          errorMessage = 'Invalid OAuth state. Please try again.'
          break
        case 'unauthorized':
          errorMessage = 'Unauthorized. Please sign in again.'
          break
        case 'store_not_found':
          errorMessage = 'Store not found.'
          break
        case 'domain_mismatch':
          errorMessage = 'Shopify domain mismatch. Please check your store domain.'
          break
        case 'missing_credentials':
          errorMessage = 'Missing credentials. Please try connecting again.'
          break
        case 'invalid_credentials':
          errorMessage = 'Invalid credentials. Please check your Client ID and Secret.'
          break
        case 'no_code':
          errorMessage = 'OAuth authorization was cancelled or failed.'
          break
        case 'oauth_failed':
          errorMessage = 'Failed to connect to Shopify. Please check your credentials and try again.'
          break
        default:
          errorMessage = decodeURIComponent(error)
      }
      
      toast.error(errorMessage, {
        duration: 4000,
      })
      // Clear query params
      router.replace('/stores')
    }
  }, [searchParams, router])

  return null
}

