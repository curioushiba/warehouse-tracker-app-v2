'use client'

import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CheckCircle2 } from 'lucide-react'

interface ClockInSuccessProps {
  storeName: string
  employeeName: string
  recordedAt: string
  onDone: () => void
}

export function ClockInSuccess({
  storeName,
  employeeName,
  recordedAt,
  onDone,
}: ClockInSuccessProps) {
  const formattedTime = new Date(recordedAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const formattedDate = new Date(recordedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Card className="max-w-md mx-auto">
      <CardBody className="text-center py-8 px-6">
        {/* Success Icon */}
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>

        {/* Success Message */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Clock In Successful!
        </h2>
        <p className="text-gray-600 mb-6">
          Your attendance has been recorded
        </p>

        {/* Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-500">Employee</dt>
              <dd className="font-medium text-gray-900">{employeeName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Store</dt>
              <dd className="font-medium text-gray-900">{storeName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Time</dt>
              <dd className="font-medium text-gray-900">{formattedTime}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Date</dt>
              <dd className="font-medium text-gray-900">{formattedDate}</dd>
            </div>
          </dl>
        </div>

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
