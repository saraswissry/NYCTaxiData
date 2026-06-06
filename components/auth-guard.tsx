'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'

/**
 * Client-side route-protection wrapper.
 *
 * Usage:
 *   <AuthGuard>
 *     <YourProtectedPage />
 *   </AuthGuard>
 *
 * If no valid JWT token is found, the user is redirected to /login.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = React.useState(false)

  React.useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
    } else {
      setChecked(true)
    }
  }, [router])

  if (!checked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3" />
          <p className="text-sm text-muted-foreground">Verifying session…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
