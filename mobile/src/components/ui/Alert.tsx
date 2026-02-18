import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native'
import { X, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react-native'
import type { AlertStatus } from '@/types'

export interface AlertProps {
  title: string
  message?: string
  status: AlertStatus
  onClose?: () => void
  testID?: string
}

const STATUS_STYLES: Record<AlertStatus, { bg: string; text: string; icon: string }> = {
  info: { bg: '#DBEAFE', text: '#1E40AF', icon: '#3B82F6' },
  success: { bg: '#DCFCE7', text: '#166534', icon: '#16A34A' },
  warning: { bg: '#FEF9C3', text: '#854D0E', icon: '#EAB308' },
  error: { bg: '#FEE2E2', text: '#991B1B', icon: '#EF4444' },
}

const STATUS_ICONS: Record<AlertStatus, React.ComponentType<{ size?: number; color?: string; testID?: string }>> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
}

export function Alert({ title, message, status, onClose, testID }: AlertProps) {
  const statusStyle = STATUS_STYLES[status]
  const StatusIcon = STATUS_ICONS[status]

  const containerStyle: ViewStyle = {
    ...styles.container,
    backgroundColor: statusStyle.bg,
  }

  return (
    <View style={containerStyle} testID={testID}>
      <View style={styles.iconContainer}>
        <StatusIcon size={20} color={statusStyle.icon} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: statusStyle.text }]}>{title}</Text>
        {message ? (
          <Text
            style={[styles.message, { color: statusStyle.text }]}
            testID={testID ? `${testID}-message` : 'alert-message'}
          >
            {message}
          </Text>
        ) : null}
      </View>
      {onClose ? (
        <TouchableOpacity
          onPress={onClose}
          testID="alert-close"
          style={styles.closeButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={16} color={statusStyle.text} />
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  iconContainer: {
    marginRight: 8,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  message: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    marginLeft: 8,
    padding: 2,
  },
})
