import { createClient } from '@/lib/supabase/client'
import { DOMAIN_CONFIGS, type DomainId } from '@/lib/domain-config'
import { itemToCachedItem } from '@/lib/db/conversions'
import { cacheItems } from '@/lib/db/items-cache'
import type { Item } from '@/lib/supabase/types'

type Db = Parameters<typeof cacheItems>[0]

export interface ItemSyncResult {
  success: boolean
  count?: number
  error?: string
}

export async function fetchAndCacheItems(db: Db, domainId: DomainId): Promise<ItemSyncResult> {
  const config = DOMAIN_CONFIGS[domainId]
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from(config.itemsTable)
      .select('*')
      .eq('is_archived', false)

    if (error) {
      return { success: false, error: error.message }
    }

    const items = (data as unknown as Item[]).map((item) => itemToCachedItem(item, domainId))
    cacheItems(db, items, domainId)

    return { success: true, count: items.length }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
