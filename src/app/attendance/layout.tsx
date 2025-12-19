import { AttendanceAuthProvider } from '@/contexts/AttendanceAuthContext'

export const metadata = {
  title: 'Attendance - PackTrack',
  description: 'Employee attendance clock-in',
}

export default function AttendanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AttendanceAuthProvider>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </AttendanceAuthProvider>
  )
}
