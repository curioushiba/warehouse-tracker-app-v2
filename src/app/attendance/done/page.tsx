import { Card, CardBody } from '@/components/ui/Card'
import { CheckCircle2 } from 'lucide-react'

export default function DonePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-md">
        <CardBody className="text-center py-8 px-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            All Done!
          </h2>
          <p className="text-gray-600">
            You can now close this page.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
