import type { TransactionType } from '../types';

export interface PendingTransaction {
  id: string;
  item_id: string;
  transaction_type: TransactionType;
  quantity: number;
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
  unit_price: number | null;
  category_id: string | null;
  category_name: string | null;
  quantity_decimals: number;
  is_archived: boolean;
  updated_at: string;
}
