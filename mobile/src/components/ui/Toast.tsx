import Toast from 'react-native-toast-message'
import type { AlertStatus } from '@/types'

export interface ShowToastOptions {
  message: string
  status: AlertStatus
  duration?: number
}

const STATUS_TYPE_MAP: Record<AlertStatus, string> = {
  success: 'success',
  error: 'error',
  info: 'info',
  warning: 'info',
}

export function showToast({ message, status, duration = 3000 }: ShowToastOptions) {
  Toast.show({
    type: STATUS_TYPE_MAP[status],
    text1: message,
    visibilityTime: duration,
  })
}
