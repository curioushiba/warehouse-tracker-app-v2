'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAttendanceAuth } from '@/contexts/AttendanceAuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormControl, FormLabel } from '@/components/ui/Form'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'

function AttendanceLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated, isLoading: authLoading } = useAttendanceAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get redirect destination from query params
  const redirectTo = searchParams.get('redirect') ?? '/attendance/checkin'
  const storeCode = searchParams.get('store')

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const url = storeCode ? `${redirectTo}?store=${storeCode}` : redirectTo
      router.replace(url)
    }
  }, [authLoading, isAuthenticated, router, redirectTo, storeCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password) {
      setError('Please enter username and password')
      return
    }

    setIsSubmitting(true)

    const result = await login(username.trim(), password)

    if (!result.success) {
      setError(result.error ?? 'Login failed')
      setIsSubmitting(false)
      return
    }

    // Redirect to clock-in page
    const url = storeCode ? `${redirectTo}?store=${storeCode}` : redirectTo
    router.replace(url)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader
          title="Attendance Login"
          subtitle="Sign in to clock in your attendance"
        />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert status="error" className="mb-4">
                {error}
              </Alert>
            )}

            <FormControl isRequired>
              <FormLabel>Username</FormLabel>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                autoFocus
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </FormControl>

            <Button
              type="submit"
              variant="cta"
              className="w-full"
              isLoading={isSubmitting}
            >
              Sign In
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}

export default function AttendanceLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <AttendanceLoginContent />
    </Suspense>
  )
}
