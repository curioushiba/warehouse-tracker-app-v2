export interface PendingProduction {
  id: string;
  item_id: string;
  quantity_produced: number;
  waste_quantity: number;
  waste_reason: string | null;
  notes: string | null;
  device_timestamp: string;
  created_at: string;
  status: 'pending' | 'syncing' | 'failed';
}

export interface CachedItem {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  current_stock: number;
  min_stock: number;
  max_stock: number | null;
  unit: string;
  category_name: string | null;
  is_commissary: boolean;
  updated_at: string;
}

export interface CachedTarget {
  id: string;
  item_id: string;
  target_quantity: number;
  target_date: string;
  priority: number;
  notes: string | null;
}

export interface CachedProduction {
  id: string;
  item_id: string;
  quantity_produced: number;
  event_timestamp: string;
  status: string;
}
