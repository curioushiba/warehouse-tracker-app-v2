import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  SectionList,
  RefreshControl,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { ClipboardList, ChevronRight } from 'lucide-react-native'
import { useAuth } from '@/contexts/AuthContext'
import { useDomain } from '@/contexts/DomainContext'
import { useTheme } from '@/theme'
import { createClient } from '@/lib/supabase/client'
import { getTransactionsByDomain } from '@/lib/db/transaction-queue'
import { getCachedItem } from '@/lib/db/items-cache'
import { formatRelativeTime } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import { TransactionTypeBadge } from '@/components/indicators/TransactionTypeBadge'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { DateGroupHeader } from '@/components/ui/DateGroupHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { StaggeredFadeIn } from '@/components/ui/StaggeredFadeIn'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'
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

// Unified row for the list
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

type FilterType = 'all' | 'in' | 'out'

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

function getTypeColor(type: 'in' | 'out' | 'adjustment', colors: { checkIn: string; checkOut: string; adjustment: string }): string {
  if (type === 'in') return colors.checkIn
  if (type === 'out') return colors.checkOut
  return colors.adjustment
}

interface TransactionSection {
  title: string
  data: DisplayTransaction[]
}

export function groupTransactionsByDate(transactions: DisplayTransaction[]): TransactionSection[] {
  const now = new Date()
  const todayStr = now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toDateString()

  const groups = new Map<string, DisplayTransaction[]>()
  const groupOrder: string[] = []

  for (const tx of transactions) {
    const txDate = new Date(tx.timestamp)
    const txDateStr = txDate.toDateString()
    let label: string
    if (txDateStr === todayStr) {
      label = 'Today'
    } else if (txDateStr === yesterdayStr) {
      label = 'Yesterday'
    } else {
      const month = txDate.toLocaleString('en-US', { month: 'short' })
      const day = txDate.getDate()
      label = `${month} ${day}`
    }

    if (!groups.has(label)) {
      groups.set(label, [])
      groupOrder.push(label)
    }
    groups.get(label)!.push(tx)
  }

  return groupOrder.map((title) => ({
    title,
    data: groups.get(title)!,
  }))
}

const FETCH_LIMIT = 50

const FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'In', value: 'in' },
  { label: 'Out', value: 'out' },
]

export default function HistoryScreen() {
  const { user } = useAuth()
  const { domainConfig } = useDomain()
  const db = useSQLiteContext()
  const { colors, spacing, typography, radii, fontFamily, shadows } = useTheme()

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
  const [filter, setFilter] = useState<FilterType>('all')

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

      // Resolve item names for pending transactions from local cache
      const pendingDisplay = pending.map((tx) => {
        let itemName = tx.itemId
        try {
          const cachedItem = getCachedItem(dbRef.current as never, tx.itemId)
          if (cachedItem) {
            itemName = cachedItem.name
          }
        } catch {
          // Ignore lookup errors
        }
        return {
          id: tx.id,
          transactionType: tx.transactionType,
          quantity: tx.quantity,
          notes: tx.notes ?? null,
          itemId: tx.itemId,
          itemName,
          timestamp: tx.deviceTimestamp,
          isPending: true,
        }
      })
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

  // Filter transactions
  const filteredTransactions = filter === 'all'
    ? transactions
    : transactions.filter((tx) => normalizeTransactionType(tx.transactionType) === filter)

  const sections = groupTransactionsByDate(filteredTransactions)

  // Track global index for stagger animation (first 10 items)
  let globalIndex = 0

  const renderItem = useCallback(
    ({ item, index, section }: { item: DisplayTransaction; index: number; section: TransactionSection }) => {
      const normalizedType = normalizeTransactionType(item.transactionType)
      const isCheckOut = normalizedType === 'out'
      const quantityColor = getTypeColor(normalizedType, colors)
      const barColor = getTypeColor(normalizedType, colors)

      // Calculate global index across all sections for stagger
      let itemGlobalIndex = 0
      for (const s of sections) {
        if (s === section) {
          itemGlobalIndex += index
          break
        }
        itemGlobalIndex += s.data.length
      }

      const row = (
        <AnimatedPressable
          onPress={() => setSelectedTx(item)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfacePrimary,
            paddingRight: spacing[4],
            paddingVertical: spacing[3],
            borderBottomWidth: 1,
            borderBottomColor: colors.bgTertiary,
          }}
          testID={`tx-row-${item.id}`}
        >
          {/* Left color bar */}
          <View
            style={{
              width: 3,
              alignSelf: 'stretch',
              backgroundColor: barColor,
              borderTopRightRadius: 2,
              borderBottomRightRadius: 2,
              marginRight: spacing[3],
            }}
          />

          {/* Content */}
          <View style={{ flex: 1, marginRight: spacing[3] }}>
            <Text
              style={{
                ...typography.md,
                fontWeight: typography.weight.semibold,
                color: colors.textPrimary,
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              {item.itemName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] }}>
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
              <Text style={{ ...typography.sm, color: colors.textTertiary }}>
                {formatRelativeTime(item.timestamp)}
              </Text>
            </View>
          </View>

          {/* Quantity */}
          <Text
            style={{
              ...typography.lg,
              fontWeight: typography.weight.bold,
              color: quantityColor,
              marginRight: spacing[2],
            }}
          >
            {isCheckOut ? '-' : '+'}
            {Math.abs(item.quantity)}
          </Text>

          {/* Chevron */}
          <ChevronRight size={16} color={colors.textTertiary} />
        </AnimatedPressable>
      )

      if (itemGlobalIndex < 10) {
        return (
          <StaggeredFadeIn index={itemGlobalIndex} testID={`stagger-${item.id}`}>
            {row}
          </StaggeredFadeIn>
        )
      }

      return row
    },
    [colors, spacing, typography, sections]
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: TransactionSection }) => (
      <DateGroupHeader
        date={section.title}
        count={section.data.length}
        testID={`date-header-${section.title}`}
      />
    ),
    []
  )

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6], backgroundColor: colors.bgPrimary }}
        testID="history-loading"
      >
        <Spinner size="large" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing[4],
          paddingTop: spacing[4],
          paddingBottom: spacing[2],
          backgroundColor: colors.bgPrimary,
        }}
      >
        <Text
          style={{
            ...typography.xl,
            fontWeight: typography.weight.bold,
            fontFamily: fontFamily.heading,
            color: colors.textPrimary,
          }}
          testID="history-title"
        >
          History
        </Text>
        <Text
          style={{
            ...typography.sm,
            color: colors.textTertiary,
          }}
          testID="history-count"
        >
          {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Segmented control filter */}
      <View
        style={{
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[2],
          alignItems: 'center',
        }}
      >
        <SegmentedControl
          options={FILTER_OPTIONS}
          value={filter}
          onValueChange={(v) => setFilter(v as FilterType)}
          fullWidth
          testID="filter-control"
        />
      </View>

      <SectionList
        testID="history-list"
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<ClipboardList size={56} color={colors.textTertiary} />}
            title="No transactions yet"
            message="Start scanning items to see your history here"
            testID="history-empty"
          />
        }
        contentContainerStyle={
          filteredTransactions.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : undefined
        }
        stickySectionHeadersEnabled={false}
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
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: spacing[2],
                borderBottomWidth: 1,
                borderBottomColor: colors.bgTertiary,
              }}
            >
              <Text style={{ ...typography.base, color: colors.textSecondary, fontWeight: typography.weight.medium }}>Type</Text>
              <TransactionTypeBadge
                type={normalizeTransactionType(selectedTx.transactionType)}
              />
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: spacing[2],
                borderBottomWidth: 1,
                borderBottomColor: colors.bgTertiary,
              }}
            >
              <Text style={{ ...typography.base, color: colors.textSecondary, fontWeight: typography.weight.medium }}>Item</Text>
              <Text
                style={{
                  ...typography.base,
                  color: colors.textPrimary,
                  fontWeight: typography.weight.semibold,
                  flexShrink: 1,
                  textAlign: 'right',
                  marginLeft: spacing[3],
                }}
              >
                {selectedTx.itemName}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: spacing[2],
                borderBottomWidth: 1,
                borderBottomColor: colors.bgTertiary,
              }}
            >
              <Text style={{ ...typography.base, color: colors.textSecondary, fontWeight: typography.weight.medium }}>Quantity</Text>
              <Text style={{ ...typography.base, color: colors.textPrimary, fontWeight: typography.weight.semibold }}>
                {Math.abs(selectedTx.quantity)}
              </Text>
            </View>
            {selectedTx.notes ? (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: spacing[2],
                  borderBottomWidth: 1,
                  borderBottomColor: colors.bgTertiary,
                }}
              >
                <Text style={{ ...typography.base, color: colors.textSecondary, fontWeight: typography.weight.medium }}>Notes</Text>
                <Text
                  style={{
                    ...typography.base,
                    color: colors.textPrimary,
                    fontWeight: typography.weight.semibold,
                    flexShrink: 1,
                    textAlign: 'right',
                    marginLeft: spacing[3],
                  }}
                >
                  {selectedTx.notes}
                </Text>
              </View>
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: spacing[2],
                borderBottomWidth: 1,
                borderBottomColor: colors.bgTertiary,
              }}
            >
              <Text style={{ ...typography.base, color: colors.textSecondary, fontWeight: typography.weight.medium }}>Time</Text>
              <Text style={{ ...typography.base, color: colors.textPrimary, fontWeight: typography.weight.semibold }}>
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
