'use client'

import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Clock } from 'lucide-react'

interface ClockInCooldownProps {
  lastRecordAt: string
  minutesRemaining: number
  storeName: string
  onDone: () => void
}

export function ClockInCooldown({
  lastRecordAt,
  minutesRemaining,
  storeName,
  onDone,
}: ClockInCooldownProps) {
  const formattedLastTime = new Date(lastRecordAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const formattedLastDate = new Date(lastRecordAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const hours = Math.floor(minutesRemaining / 60)
  const minutes = Math.round(minutesRemaining % 60)

  const timeRemaining = hours > 0
    ? `${hours}h ${minutes}m`
    : `${minutes}m`

  return (
    <Card className="max-w-md mx-auto">
      <CardBody className="text-center py-8 px-6">
        {/* Clock Icon */}
        <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
          <Clock className="w-12 h-12 text-amber-600" />
        </div>

        {/* Message */}
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Already Clocked In
        </h2>
        <p className="text-gray-600 mb-6">
          You&apos;ve already clocked in recently
        </p>

        {/* Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500 mb-1">Last clock-in</p>
          <p className="text-lg font-semibold text-gray-900">
            {formattedLastTime} on {formattedLastDate}
          </p>
        </div>

        {/* Cooldown Timer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800 mb-1">
            You can clock in again in
          </p>
          <p className="text-2xl font-bold text-amber-900">
            {timeRemaining}
          </p>
        </div>

        {/* Note */}
        <p className="text-sm text-gray-500 mb-6">
          Attempting to clock in at: {storeName}
        </p>

        {/* Done Button */}
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={onDone}
        >
          Done
        </Button>
      </CardBody>
    </Card>
  )
}
