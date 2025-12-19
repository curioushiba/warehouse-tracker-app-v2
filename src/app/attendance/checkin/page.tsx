'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAttendanceAuth } from '@/contexts/AttendanceAuthContext'
import { ProtectedAttendanceRoute } from '@/components/attendance/ProtectedAttendanceRoute'
import { ClockInConfirmation } from '@/components/attendance/ClockInConfirmation'
import { ClockInSuccess } from '@/components/attendance/ClockInSuccess'
import { ClockInCooldown } from '@/components/attendance/ClockInCooldown'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getStoreByQrCode } from '@/lib/actions/attendance/stores'
import { recordAttendance } from '@/lib/actions/attendance/records'
import { getDeviceInfo } from '@/lib/attendance/auth-utils'
import type { AttStore, RecordAttendanceResult } from '@/lib/supabase/attendance-types'

type PageState = 'loading' | 'no-store' | 'store-not-found' | 'confirm' | 'submitting' | 'success' | 'cooldown' | 'error'

function CheckInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { employee } = useAttendanceAuth()

  const storeCode = searchParams.get('store')

  const [pageState, setPageState] = useState<PageState>('loading')
  const [store, setStore] = useState<AttStore | null>(null)
  const [result, setResult] = useState<RecordAttendanceResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load store on mount
  useEffect(() => {
    const loadStore = async () => {
      if (!storeCode) {
        setPageState('no-store')
        return
      }

      const storeResult = await getStoreByQrCode(storeCode)

      if (!storeResult.success) {
        setPageState('store-not-found')
        setError(storeResult.error)
        return
      }

      setStore(storeResult.data)
      setPageState('confirm')
    }

    loadStore()
  }, [storeCode])

  const handleConfirm = async () => {
    if (!store || !employee) return

    setPageState('submitting')
    setError(null)

    const deviceInfo = getDeviceInfo()
    const attendanceResult = await recordAttendance(employee.id, store.id, deviceInfo)

    if (!attendanceResult.success) {
      setPageState('error')
      setError(attendanceResult.error)
      return
    }

    const data = attendanceResult.data

    if (!data.success) {
      // Cooldown or other business logic error
      if (data.minutes_remaining !== undefined) {
        setResult(data)
        setPageState('cooldown')
      } else {
        setPageState('error')
        setError(data.error ?? 'Failed to record attendance')
      }
      return
    }

    setResult(data)
    setPageState('success')
  }

  const handleDone = () => {
    // Close the page or go to a neutral state
    // On mobile, this might close the browser tab
    window.close()
    // If window.close() doesn't work (e.g., not opened by script), show a message
    router.push('/attendance/done')
  }

  const handleRetry = () => {
    setPageState('confirm')
    setError(null)
  }

  // Render based on state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (pageState === 'no-store') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardBody className="text-center py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Store Selected</h2>
            <p className="text-gray-600 mb-4">
              Please scan a store QR code to clock in.
            </p>
            <Button variant="secondary" onClick={() => router.push('/attendance/login')}>
              Go to Login
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (pageState === 'store-not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardBody className="text-center py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Store Not Found</h2>
            <p className="text-gray-600 mb-4">
              The scanned QR code is invalid or the store is inactive.
            </p>
            {error && (
              <Alert status="error" className="mb-4 text-left">{error}</Alert>
            )}
            <Button variant="secondary" onClick={() => router.push('/attendance/login')}>
              Try Again
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (pageState === 'confirm' || pageState === 'submitting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ClockInConfirmation
          store={store!}
          employeeName={employee?.display_name ?? 'Employee'}
          onConfirm={handleConfirm}
          isLoading={pageState === 'submitting'}
        />
      </div>
    )
  }

  if (pageState === 'success' && result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ClockInSuccess
          storeName={result.store_name ?? store?.name ?? 'Store'}
          employeeName={result.employee_name ?? employee?.display_name ?? 'Employee'}
          recordedAt={result.record?.recorded_at ?? new Date().toISOString()}
          onDone={handleDone}
        />
      </div>
    )
  }

  if (pageState === 'cooldown' && result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ClockInCooldown
          lastRecordAt={result.last_record_at ?? new Date().toISOString()}
          minutesRemaining={result.minutes_remaining ?? 0}
          storeName={store?.name ?? 'Store'}
          onDone={handleDone}
        />
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardBody className="text-center py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
            <Alert status="error" className="mb-4 text-left">
              {error ?? 'An unexpected error occurred'}
            </Alert>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={handleDone}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  return null
}

function CheckInPageContent() {
  return (
    <ProtectedAttendanceRoute>
      <CheckInContent />
    </ProtectedAttendanceRoute>
  )
}

export default function CheckInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    }>
      <CheckInPageContent />
    </Suspense>
  )
}
