import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { randomUUID } from 'expo-crypto'
import { clampQuantity, roundToDecimalPlaces } from '@/lib/constants'
import type { Item } from '@/lib/supabase/types'

// --- Types ---

export interface BatchItem {
  itemId: string
  item: Item
  quantity: number
  /** Pre-generated idempotency key for transaction submission */
  idempotencyKey: string
}

export type BatchTransactionType = 'in' | 'out'

export interface BatchScanState {
  items: BatchItem[]
  transactionType: BatchTransactionType
}

export interface BatchScanManager {
  addItem: (item: Item) => boolean
  incrementItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  removeItem: (itemId: string) => void
  removeItems: (itemIds: string[]) => void
  clearBatch: () => void
  setTransactionType: (type: BatchTransactionType) => void
  hasItem: (itemId: string) => boolean
  totalItems: () => number
  totalUnits: () => number
}

interface BatchScanContextValue {
  items: BatchItem[]
  transactionType: BatchTransactionType
  addItem: (item: Item) => boolean
  incrementItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  removeItem: (itemId: string) => void
  removeItems: (itemIds: string[]) => void
  clearBatch: () => void
  setTransactionType: (type: BatchTransactionType) => void
  hasItem: (itemId: string) => boolean
  totalItems: number
  totalUnits: number
}

// --- Pure logic (testable) ---

/**
 * Creates a state manager for batch scan operations.
 * Exported for direct testing without React rendering.
 * Uses expo-crypto randomUUID() instead of crypto.randomUUID().
 *
 * @param setState - Callback to update the state
 * @param getState - Callback to get current state
 */
export function createBatchScanManager(
  setState: (state: Partial<BatchScanState>) => void,
  getState: () => BatchScanState
): BatchScanManager {
  function addItem(item: Item): boolean {
    const current = getState()
    // Check for duplicate
    if (current.items.some(i => i.itemId === item.id)) {
      return false
    }

    const newItem: BatchItem = {
      itemId: item.id,
      item,
      quantity: 1,
      idempotencyKey: randomUUID(),
    }
    setState({ items: [...current.items, newItem] })
    return true
  }

  function incrementItem(itemId: string) {
    const current = getState()
    setState({
      items: current.items.map(item =>
        item.itemId === itemId
          ? { ...item, quantity: roundToDecimalPlaces(item.quantity + 1) }
          : item
      ),
    })
  }

  function updateQuantity(itemId: string, quantity: number) {
    const clamped = clampQuantity(quantity)
    const current = getState()
    setState({
      items: current.items.map(item =>
        item.itemId === itemId
          ? { ...item, quantity: clamped }
          : item
      ),
    })
  }

  function removeItem(itemId: string) {
    const current = getState()
    setState({
      items: current.items.filter(item => item.itemId !== itemId),
    })
  }

  function removeItems(itemIds: string[]) {
    const idsSet = new Set(itemIds)
    const current = getState()
    setState({
      items: current.items.filter(item => !idsSet.has(item.itemId)),
    })
  }

  function clearBatch() {
    setState({ items: [] })
  }

  function setTransactionType(type: BatchTransactionType) {
    setState({ transactionType: type })
  }

  function hasItem(itemId: string): boolean {
    const current = getState()
    return current.items.some(item => item.itemId === itemId)
  }

  function totalItems(): number {
    return getState().items.length
  }

  function totalUnits(): number {
    const items = getState().items
    return roundToDecimalPlaces(
      items.reduce((sum, item) => sum + item.quantity, 0)
    )
  }

  return {
    addItem,
    incrementItem,
    updateQuantity,
    removeItem,
    removeItems,
    clearBatch,
    setTransactionType,
    hasItem,
    totalItems,
    totalUnits,
  }
}

// --- React context ---

const BatchScanContext = createContext<BatchScanContextValue | undefined>(undefined)

export function BatchScanProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BatchItem[]>([])
  const [transactionType, setTransactionType] = useState<BatchTransactionType>('in')

  const stateRef = React.useRef<BatchScanState>({ items, transactionType })
  stateRef.current = { items, transactionType }

  const managerRef = React.useRef<BatchScanManager | null>(null)
  if (!managerRef.current) {
    managerRef.current = createBatchScanManager(
      (partial) => {
        if (partial.items !== undefined) setItems(partial.items)
        if (partial.transactionType !== undefined) setTransactionType(partial.transactionType)
      },
      () => stateRef.current
    )
  }

  const addItem = useCallback((item: Item): boolean => {
    return managerRef.current!.addItem(item)
  }, [])

  const incrementItem = useCallback((itemId: string) => {
    managerRef.current?.incrementItem(itemId)
  }, [])

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    managerRef.current?.updateQuantity(itemId, quantity)
  }, [])

  const removeItem = useCallback((itemId: string) => {
    managerRef.current?.removeItem(itemId)
  }, [])

  const removeItems = useCallback((itemIds: string[]) => {
    managerRef.current?.removeItems(itemIds)
  }, [])

  const clearBatch = useCallback(() => {
    managerRef.current?.clearBatch()
  }, [])

  const handleSetTransactionType = useCallback((type: BatchTransactionType) => {
    managerRef.current?.setTransactionType(type)
  }, [])

  const hasItem = useCallback((itemId: string): boolean => {
    return managerRef.current?.hasItem(itemId) ?? false
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
