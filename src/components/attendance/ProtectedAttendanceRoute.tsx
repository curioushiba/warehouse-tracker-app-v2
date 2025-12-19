'use client'

import { useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useAttendanceAuth } from '@/contexts/AttendanceAuthContext'
import { Spinner } from '@/components/ui/Spinner'
import { buildLoginUrl } from '@/lib/attendance/auth-utils'

interface ProtectedAttendanceRouteProps {
  children: React.ReactNode
}

export function ProtectedAttendanceRoute({ children }: ProtectedAttendanceRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading } = useAttendanceAuth()

  const storeCode = searchParams.get('store') ?? undefined

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const loginUrl = buildLoginUrl(storeCode, pathname)
      router.replace(loginUrl)
    }
  }, [isLoading, isAuthenticated, router, pathname, storeCode])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    // Will redirect, show loading
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return <>{children}</>
}
