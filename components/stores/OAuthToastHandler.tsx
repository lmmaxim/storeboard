'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

const errorMessages: Record<string, string> = {
  invalid_state: 'Invalid OAuth state. Please try connecting again.',
  unauthorized: 'You are not authorized to perform this action.',
  store_not_found: 'Store not found.',
  domain_mismatch: 'Shopify domain does not match your store.',
  missing_credentials: 'Missing credentials. Please try connecting again.',
  invalid_credentials: 'Invalid credentials format.',
  no_code: 'OAuth authorization was cancelled or failed.',
  oauth_failed: 'Failed to complete OAuth flow. Please try again.',
}

export function OAuthToastHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const lastSuccessValue = useRef<string | null>(null)
  const lastErrorValue = useRef<string | null>(null)

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    // Handle success messages
    if (success && success !== lastSuccessValue.current) {
      lastSuccessValue.current = success
      if (success === 'connected') {
        toast.success('Successfully connected to Shopify!')
      } else {
        toast.success(success)
      }
      // Clean up URL by removing the query parameter
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      router.replace(url.pathname + url.search, { scroll: false })
    } else if (!success) {
      lastSuccessValue.current = null
    }

    // Handle error messages
    if (error && error !== lastErrorValue.current) {
      lastErrorValue.current = error
      const errorMessage = errorMessages[error] || 'An error occurred. Please try again.'
      toast.error(errorMessage)
      // Clean up URL by removing the query parameter
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      router.replace(url.pathname + url.search, { scroll: false })
    } else if (!error) {
      lastErrorValue.current = null
    }
  }, [searchParams, router])

  return null
}

