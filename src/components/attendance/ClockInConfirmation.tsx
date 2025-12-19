'use client'

import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MapPin, Clock, Store } from 'lucide-react'
import type { AttStore } from '@/lib/supabase/attendance-types'

interface ClockInConfirmationProps {
  store: AttStore
  employeeName: string
  onConfirm: () => void
  isLoading?: boolean
}

export function ClockInConfirmation({
  store,
  employeeName,
  onConfirm,
  isLoading = false,
}: ClockInConfirmationProps) {
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Card className="max-w-md mx-auto">
      <CardBody className="text-center py-8 px-6">
        {/* Store Icon */}
        <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-6">
          <Store className="w-8 h-8 text-primary-600" />
        </div>

        {/* Greeting */}
        <p className="text-gray-600 mb-2">Welcome,</p>
        <h2 className="text-xl font-bold text-gray-900 mb-6">{employeeName}</h2>

        {/* Store Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
            <MapPin className="w-5 h-5" />
            <span className="text-sm">Clocking in at</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{store.name}</h3>
          {store.qr_code && (
            <p className="text-sm text-gray-500 font-mono mt-1">{store.qr_code}</p>
          )}
        </div>

        {/* Time Display */}
        <div className="flex items-center justify-center gap-2 text-gray-600 mb-6">
          <Clock className="w-5 h-5" />
          <div className="text-left">
            <p className="text-2xl font-bold text-gray-900">{currentTime}</p>
            <p className="text-sm text-gray-500">{currentDate}</p>
          </div>
        </div>

        {/* Confirm Button */}
        <Button
          variant="cta"
          size="lg"
          className="w-full"
          onClick={onConfirm}
          isLoading={isLoading}
        >
          Confirm Clock In
        </Button>
      </CardBody>
    </Card>
  )
}
