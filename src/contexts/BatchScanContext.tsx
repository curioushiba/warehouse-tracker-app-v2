'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { Item } from '@/lib/supabase/types'

export interface BatchItem {
  itemId: string
  item: Item
  quantity: number
  /** Pre-generated idempotency key for transaction submission */
  idempotencyKey: string
}

export type BatchTransactionType = 'in' | 'out'

// Quantity validation constants (matches existing transaction page)
const MIN_QUANTITY = 0.001
const MAX_QUANTITY = 9999.999
const DECIMAL_PLACES = 3

/** Round to proper decimal places */
function roundToDecimalPlaces(value: number): number {
  const factor = Math.pow(10, DECIMAL_PLACES)
  return Math.round(value * factor) / factor
}

interface BatchScanContextValue {
  items: BatchItem[]
  transactionType: BatchTransactionType
  /** Returns true if item was added, false if it already exists (for duplicate handling) */
  addItem: (item: Item) => boolean
  /** Increment quantity for existing item (used when user confirms duplicate add) */
  incrementItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  removeItem: (itemId: string) => void
  /** Remove multiple items by ID (used after successful submissions) */
  removeItems: (itemIds: string[]) => void
  clearBatch: () => void
  setTransactionType: (type: BatchTransactionType) => void
  /** Check if an item is already in the batch */
  hasItem: (itemId: string) => boolean
  /** Get total item count */
  totalItems: number
  /** Get total units (sum of all quantities) */
  totalUnits: number
}

const BatchScanContext = createContext<BatchScanContextValue | undefined>(undefined)

export function BatchScanProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BatchItem[]>([])
  const [transactionType, setTransactionType] = useState<BatchTransactionType>('in')

  const hasItem = useCallback((itemId: string) => {
    return items.some(item => item.itemId === itemId)
  }, [items])

  const addItem = useCallback((item: Item): boolean => {
    // Check for duplicate
    if (items.some(i => i.itemId === item.id)) {
      return false // Item already exists, caller should handle duplicate prompt
    }

    setItems(prev => [...prev, {
      itemId: item.id,
      item,
      quantity: 1,
      // Generate idempotency key at add time per CLAUDE.md requirements
      idempotencyKey: crypto.randomUUID()
    }])
    return true
  }, [items])

  const incrementItem = useCallback((itemId: string) => {
    setItems(prev => prev.map(item =>
      item.itemId === itemId
        ? { ...item, quantity: roundToDecimalPlaces(item.quantity + 1) }
        : item
    ))
  }, [])

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    // Enforce min/max and round to decimal places
    const clampedQuantity = roundToDecimalPlaces(
      Math.max(MIN_QUANTITY, Math.min(MAX_QUANTITY, quantity))
    )
    setItems(prev => prev.map(item =>
      item.itemId === itemId
        ? { ...item, quantity: clampedQuantity }
        : item
    ))
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.itemId !== itemId))
  }, [])

  const removeItems = useCallback((itemIds: string[]) => {
    const idsSet = new Set(itemIds)
    setItems(prev => prev.filter(item => !idsSet.has(item.itemId)))
  }, [])

  const clearBatch = useCallback(() => {
    setItems([])
  }, [])

  const handleSetTransactionType = useCallback((type: BatchTransactionType) => {
    setTransactionType(type)
  }, [])

  const totalItems = items.length
  const totalUnits = roundToDecimalPlaces(
    items.reduce((sum, item) => sum + item.quantity, 0)
  )

  const value = useMemo<BatchScanContextValue>(() => ({
    items,
    transactionType,
    addItem,
    incrementItem,
    updateQuantity,
    removeItem,
    removeItems,
    clearBatch,
    setTransactionType: handleSetTransactionType,
    hasItem,
    totalItems,
    totalUnits,
  }), [items, transactionType, addItem, incrementItem, updateQuantity, removeItem, removeItems, clearBatch, handleSetTransactionType, hasItem, totalItems, totalUnits])

  return (
    <BatchScanContext.Provider value={value}>
      {children}
    </BatchScanContext.Provider>
  )
}

export function useBatchScan() {
  const context = useContext(BatchScanContext)
  if (context === undefined) {
    throw new Error('useBatchScan must be used within a BatchScanProvider')
  }
  return context
}
