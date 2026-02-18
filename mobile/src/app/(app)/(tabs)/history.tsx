import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useAuth } from '@/contexts/AuthContext'
import { useDomain } from '@/contexts/DomainContext'
import { createClient } from '@/lib/supabase/client'
import { getTransactionsByDomain } from '@/lib/db/transaction-queue'
import { formatRelativeTime } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import { TransactionTypeBadge } from '@/components/indicators/TransactionTypeBadge'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import type { QueuedTransaction } from '@/types/offline'

// Supabase transaction shape from the domain table
interface RemoteTransaction {
  id: string
  transaction_type: string
  quantity: number
  notes: string | null
  item_id: string
  item_name?: string
  user_id: string
  event_timestamp: string
  server_timestamp: string
}

// Unified row for the FlatList
interface DisplayTransaction {
  id: string
  transactionType: string
  quantity: number
  notes: string | null
  itemId: string
  itemName: string
  timestamp: string
  isPending: boolean
}

function normalizeTransactionType(type: string): 'in' | 'out' | 'adjustment' {
  if (type === 'check_in' || type === 'in') return 'in'
  if (type === 'check_out' || type === 'out') return 'out'
  return 'adjustment'
}

function remoteToDisplay(tx: RemoteTransaction): DisplayTransaction {
  return {
    id: tx.id,
    transactionType: tx.transaction_type,
    quantity: tx.quantity,
    notes: tx.notes,
    itemId: tx.item_id,
    itemName: tx.item_name ?? tx.item_id,
    timestamp: tx.event_timestamp,
    isPending: false,
  }
}

function pendingToDisplay(tx: QueuedTransaction): DisplayTransaction {
  return {
    id: tx.id,
    transactionType: tx.transactionType,
    quantity: tx.quantity,
    notes: tx.notes ?? null,
    itemId: tx.itemId,
    itemName: tx.itemId, // no name available offline
    timestamp: tx.deviceTimestamp,
    isPending: true,
  }
}

const FETCH_LIMIT = 50

export default function HistoryScreen() {
  const { user } = useAuth()
  const { domainConfig } = useDomain()
  const db = useSQLiteContext()

  // Use refs for values accessed inside fetchTransactions to avoid
  // re-creating the callback (and thus re-triggering useEffect) on every render
  const userRef = useRef(user)
  userRef.current = user
  const domainConfigRef = useRef(domainConfig)
  domainConfigRef.current = domainConfig
  const dbRef = useRef(db)
  dbRef.current = db

  const [transactions, setTransactions] = useState<DisplayTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedTx, setSelectedTx] = useState<DisplayTransaction | null>(null)

  const fetchTransactions = useCallback(async () => {
    const currentUser = userRef.current
    const currentDomainConfig = domainConfigRef.current
    if (!currentDomainConfig || !currentUser) return

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from(currentDomainConfig.transactionsTable)
        .select('*')
        .eq('user_id', currentUser.id)
        .order('event_timestamp', { ascending: false })
        .limit(FETCH_LIMIT)

      if (error || !data) {
        setTransactions([])
        return
      }

      // Get pending transactions from local queue
      let pending: QueuedTransaction[] = []
      try {
        pending = getTransactionsByDomain(dbRef.current as never, currentDomainConfig.transactionDomain)
      } catch {
        // Ignore SQLite errors
      }

      const pendingDisplay = pending.map(pendingToDisplay)
      const remoteDisplay = (data as RemoteTransaction[]).map(remoteToDisplay)

      setTransactions([...pendingDisplay, ...remoteDisplay])
    } catch {
      setTransactions([])
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      await fetchTransactions()
      if (!cancelled) {
        setIsLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [fetchTransactions])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await fetchTransactions()
    setIsRefreshing(false)
  }, [fetchTransactions])

  const renderItem = useCallback(
    ({ item }: { item: DisplayTransaction }) => {
      const normalizedType = normalizeTransactionType(item.transactionType)

      return (
        <TouchableOpacity
          style={styles.row}
          testID={`tx-row-${item.id}`}
          onPress={() => setSelectedTx(item)}
          activeOpacity={0.7}
        >
          <View style={styles.rowLeft}>
            <View style={styles.badgeRow}>
              <TransactionTypeBadge
                type={normalizedType}
                testID={`tx-badge-${item.id}`}
              />
              {item.isPending && (
                <Badge
                  label="Pending"
                  colorScheme="warning"
                  variant="subtle"
                  testID={`pending-badge-${item.id}`}
                />
              )}
            </View>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.itemName}
            </Text>
            <Text style={styles.time}>
              {formatRelativeTime(item.timestamp)}
            </Text>
          </View>
          <Text style={styles.quantity}>
            {normalizedType === 'out' ? '-' : '+'}
            {Math.abs(item.quantity)}
          </Text>
        </TouchableOpacity>
      )
    },
    []
  )

  if (isLoading) {
    return (
      <View style={styles.centered} testID="history-loading">
        <Spinner size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        testID="history-list"
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>
              Transactions will appear here once you start scanning items.
            </Text>
          </View>
        }
        contentContainerStyle={
          transactions.length === 0 ? styles.emptyContainer : undefined
        }
      />

      {/* Detail Modal */}
      <Modal
        isOpen={selectedTx !== null}
        onClose={() => setSelectedTx(null)}
        title="Transaction Details"
        testID="tx-detail-modal"
      >
        {selectedTx && (
          <View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type</Text>
              <TransactionTypeBadge
                type={normalizeTransactionType(selectedTx.transactionType)}
              />
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Item</Text>
              <Text style={styles.detailValue}>{selectedTx.itemName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quantity</Text>
              <Text style={styles.detailValue}>{Math.abs(selectedTx.quantity)}</Text>
            </View>
            {selectedTx.notes ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{selectedTx.notes}</Text>
              </View>
            ) : null}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>
                {formatRelativeTime(selectedTx.timestamp)}
              </Text>
            </View>
            {selectedTx.isPending && (
              <Badge
                label="Pending - Not yet synced"
                colorScheme="warning"
                variant="subtle"
              />
            )}
          </View>
        )}
      </Modal>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLeft: {
    flex: 1,
    marginRight: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
})
