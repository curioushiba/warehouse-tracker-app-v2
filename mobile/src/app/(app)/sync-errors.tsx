import React, { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, FlatList } from 'react-native'
import { useRouter } from 'expo-router'
import { AlertTriangle, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react-native'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/theme'
import { createClient } from '@/lib/supabase/client'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'
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

function humanizeError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('duplicate key') || lower.includes('already exists')) {
    return 'This transaction was already processed'
  }
  if (lower.includes('network') || lower.includes('timeout') || lower.includes('fetch')) {
    return 'Network connection failed'
  }
  if (lower.includes('not found')) {
    return 'Item not found in database'
  }
  if (lower.includes('insufficient') || lower.includes('stock')) {
    return 'Insufficient stock for this operation'
  }
  if (lower.includes('permission') || lower.includes('unauthorized') || lower.includes('forbidden')) {
    return 'You do not have permission for this action'
  }
  if (lower.includes('inactive') || lower.includes('deactivated')) {
    return 'Your account has been deactivated'
  }
  return message
}

export default function SyncErrorsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors, spacing, typography, radii } = useTheme()

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

  const handleRetryAll = useCallback(async () => {
    const supabase = createClient()
    for (const err of errors) {
      await supabase
        .from('inv_sync_errors')
        .update({ status: 'retrying' })
        .eq('id', err.id)
    }
    setErrors([])
  }, [errors])

  const renderItem = useCallback(
    ({ item }: { item: SyncError }) => (
      <Card variant="elevated" testID={`error-row-${item.id}`}>
        <View
          style={{
            borderLeftWidth: 3,
            borderLeftColor: colors.error,
            paddingLeft: spacing[3],
            gap: spacing[1.5],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <AlertCircle size={20} color={colors.error} />
            <Text
              style={{
                ...typography.base,
                fontWeight: typography.weight.semibold,
                color: colors.textPrimary,
                flex: 1,
              }}
            >
              {getTransactionSummary(item.transaction_data)}
            </Text>
          </View>
          <Text
            style={{
              ...typography.sm,
              color: colors.error,
              lineHeight: 18,
            }}
            testID={`error-message-${item.id}`}
          >
            {humanizeError(item.error_message)}
          </Text>
          <Text style={{ ...typography.sm, color: colors.textTertiary }}>
            {formatRelativeTime(item.created_at)}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] }}>
            <Button
              label="Retry"
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw size={14} color={colors.textPrimary} />}
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
    [handleRetry, handleDismiss, colors, spacing, typography]
  )

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6], backgroundColor: colors.bgPrimary }}
        testID="sync-errors-loading"
      >
        <Spinner size="large" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      <ScreenHeader
        title="Sync Errors"
        onBack={() => router.back()}
        rightContent={
          errors.length > 0 ? (
            <Badge label={String(errors.length)} colorScheme="error" variant="solid" testID="error-count-badge" />
          ) : undefined
        }
        testID="screen-header"
      />

      {/* Error summary bar */}
      {errors.length > 0 && (
        <View
          testID="error-summary-bar"
          style={{
            backgroundColor: colors.errorBg,
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[2.5],
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <AlertTriangle size={20} color={colors.error} />
          <Text
            style={{
              ...typography.sm,
              color: colors.error,
              fontWeight: typography.weight.medium,
              marginLeft: spacing[2],
              flex: 1,
            }}
          >
            {errors.length} unresolved {errors.length === 1 ? 'error' : 'errors'}
          </Text>
          <AnimatedPressable
            onPress={handleRetryAll}
            hapticPattern="light"
            testID="retry-all-button"
          >
            <Text
              style={{
                ...typography.sm,
                color: colors.brandPrimary,
                fontWeight: typography.weight.semibold,
              }}
            >
              Retry All
            </Text>
          </AnimatedPressable>
        </View>
      )}

      <FlatList
        testID="sync-errors-list"
        data={errors}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          { padding: spacing[4], gap: spacing[3] },
          errors.length === 0 && { flexGrow: 1, justifyContent: 'center' },
        ]}
        ListEmptyComponent={
          <EmptyState
            icon={<CheckCircle size={64} color={colors.success} />}
            title="All Clear!"
            message="No sync errors"
            action={{ label: 'Go Back', onPress: () => router.back() }}
            testID="empty-state"
          />
        }
      />
    </View>
  )
}
