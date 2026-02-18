import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatRelativeTime } from '@/lib/utils'
import type { Json } from '@/lib/supabase/types'

interface SyncError {
  id: string
  transaction_data: Json
  error_message: string
  status: string
  user_id: string | null
  created_at: string
  resolved_at: string | null
  resolution_notes: string | null
}

function getTransactionSummary(data: Json): string {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, Json | undefined>
    const type = obj.transactionType ?? obj.transaction_type ?? 'unknown'
    const qty = obj.quantity ?? '?'
    return `${type} x${qty}`
  }
  return 'Unknown transaction'
}

export default function SyncErrorsScreen() {
  const router = useRouter()
  const { user } = useAuth()

  // Use ref to avoid re-creating fetchErrors callback on every render
  const userRef = useRef(user)
  userRef.current = user

  const [errors, setErrors] = useState<SyncError[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchErrors = useCallback(async () => {
    const currentUser = userRef.current
    if (!currentUser) return

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('inv_sync_errors')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('status', 'new')
        .order('created_at', { ascending: false })

      if (error || !data) {
        setErrors([])
        return
      }

      setErrors(data as unknown as SyncError[])
    } catch {
      setErrors([])
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      await fetchErrors()
      if (!cancelled) {
        setIsLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [fetchErrors])

  const handleRetry = useCallback(async (errorId: string) => {
    const supabase = createClient()
    await supabase
      .from('inv_sync_errors')
      .update({ status: 'retrying' })
      .eq('id', errorId)

    // Remove from local list
    setErrors((prev) => prev.filter((e) => e.id !== errorId))
  }, [])

  const handleDismiss = useCallback(async (errorId: string) => {
    const supabase = createClient()
    await supabase
      .from('inv_sync_errors')
      .update({ status: 'dismissed' })
      .eq('id', errorId)

    // Remove from local list
    setErrors((prev) => prev.filter((e) => e.id !== errorId))
  }, [])

  const renderItem = useCallback(
    ({ item }: { item: SyncError }) => (
      <Card variant="elevated" testID={`error-row-${item.id}`}>
        <View style={styles.errorCard}>
          <Text style={styles.transactionSummary}>
            {getTransactionSummary(item.transaction_data)}
          </Text>
          <Text
            style={styles.errorMessage}
            testID={`error-message-${item.id}`}
          >
            {item.error_message}
          </Text>
          <Text style={styles.errorTime}>
            {formatRelativeTime(item.created_at)}
          </Text>
          <View style={styles.errorActions}>
            <Button
              label="Retry"
              variant="outline"
              size="sm"
              onPress={() => handleRetry(item.id)}
              testID={`retry-button-${item.id}`}
            />
            <Button
              label="Dismiss"
              variant="ghost"
              size="sm"
              onPress={() => handleDismiss(item.id)}
              testID={`dismiss-button-${item.id}`}
            />
          </View>
        </View>
      </Card>
    ),
    [handleRetry, handleDismiss]
  )

  if (isLoading) {
    return (
      <View style={styles.centered} testID="sync-errors-loading">
        <Spinner size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="back-button"
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sync Errors</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        testID="sync-errors-list"
        data={errors}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          errors.length === 0 && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No sync errors</Text>
            <Text style={styles.emptySubtext}>
              All transactions have been synced successfully.
            </Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    paddingRight: 12,
  },
  backText: {
    fontSize: 16,
    color: '#01722f',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60, // balance the back button width
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorCard: {
    gap: 6,
  },
  transactionSummary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  errorMessage: {
    fontSize: 13,
    color: '#EF4444',
    lineHeight: 18,
  },
  errorTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  errorActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
})
