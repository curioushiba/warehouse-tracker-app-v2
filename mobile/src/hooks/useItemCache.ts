import { useState, useEffect, useCallback, useRef } from 'react'
import type { DomainId } from '@/lib/domain-config'
import type { CachedItem } from '@/types/offline'
import { fetchAndCacheItems } from '@/lib/sync/item-sync'
import { getAllCachedItems } from '@/lib/db/items-cache'

// --- Types ---

export interface ItemCacheState {
  items: CachedItem[]
  isLoading: boolean
  error: string | null
}

export interface ItemCacheManager {
  loadItems: () => Promise<void>
  refreshFromCache: () => void
}

// --- Pure logic (testable) ---

export function createItemCacheManager(
  db: unknown,
  domainId: DomainId | null,
  setState: (state: Partial<ItemCacheState>) => void
): ItemCacheManager {
  function refreshFromCache() {
    if (!domainId) return
    try {
      const items = getAllCachedItems(db as never, domainId)
      setState({ items, isLoading: false, error: null })
    } catch {
      setState({ items: [], isLoading: false, error: 'Failed to read item cache' })
    }
  }

  async function loadItems() {
    if (!domainId) return

    setState({ isLoading: true })
    const result = await fetchAndCacheItems(db as never, domainId)
    refreshFromCache()
    if (!result.success) {
      setState({ error: result.error ?? 'Failed to load items' })
    }
  }

  return { loadItems, refreshFromCache }
}

// --- React hook ---

export function useItemCache(db: unknown, domainId: DomainId | null) {
  const [state, setItemCacheState] = useState<ItemCacheState>({
    items: [],
    isLoading: false,
    error: null,
  })

  const managerRef = useRef<ItemCacheManager | null>(null)

  useEffect(() => {
    managerRef.current = createItemCacheManager(
      db,
      domainId,
      (partial) => setItemCacheState((prev) => ({ ...prev, ...partial }))
    )
    managerRef.current.loadItems()
  }, [db, domainId])

  const refreshItems = useCallback(() => {
    managerRef.current?.loadItems()
  }, [])

  return {
    ...state,
    refreshItems,
  }
}
