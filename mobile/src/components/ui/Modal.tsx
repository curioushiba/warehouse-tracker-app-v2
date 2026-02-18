import React from 'react'
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  type ViewStyle,
} from 'react-native'
import { X } from 'lucide-react-native'
import type { ModalSize } from '@/types'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  size?: ModalSize
  testID?: string
}

const SIZE_WIDTHS: Record<ModalSize, ViewStyle> = {
  sm: { maxWidth: 320 },
  md: { maxWidth: 400 },
  lg: { maxWidth: 520 },
  full: { maxWidth: '100%' as unknown as number, margin: 0, borderRadius: 0 },
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  testID,
}: ModalProps) {
  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <TouchableWithoutFeedback onPress={onClose} testID="modal-overlay">
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.content, SIZE_WIDTHS[size]]}>
              <View style={styles.header}>
                {title ? (
                  <Text style={styles.title}>{title}</Text>
                ) : (
                  <View />
                )}
                <TouchableOpacity
                  onPress={onClose}
                  testID="modal-close"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.body}>{children}</View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  body: {},
})
