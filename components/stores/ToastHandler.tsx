'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function ToastHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const lastSuccessValue = useRef<string | null>(null)

  useEffect(() => {
    const success = searchParams.get('success')
    
    // Only show toast if we have a success value and it's different from the last one we showed
    if (success && success !== lastSuccessValue.current) {
      lastSuccessValue.current = success
      toast.success(success)
      // Clean up URL by removing the query parameter
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      router.replace(url.pathname + url.search, { scroll: false })
    } else if (!success) {
      // Reset when the success param is removed
      lastSuccessValue.current = null
    }
  }, [searchParams, router])

  return null
}

