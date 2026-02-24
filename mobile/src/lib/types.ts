export type UserRole = 'admin' | 'employee';

export type TransactionType =
  | 'check_in'
  | 'check_out'
  | 'transfer'
  | 'adjustment'
  | 'write_off'
  | 'return';

export type SyncErrorStatus = 'pending' | 'resolved' | 'dismissed';

export function isStockInType(type: TransactionType): boolean {
  return type === 'check_in' || type === 'return';
}

export interface Profile {
  id: string;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category_id: string | null;
  unit: string;
  current_stock: number;
  min_stock: number;
  max_stock: number | null;
  unit_price: number | null;
  barcode: string | null;
  is_archived: boolean;
  is_commissary: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  transaction_type: TransactionType;
  item_id: string;
  quantity: number;
  stock_before: number | null;
  stock_after: number | null;
  user_id: string;
  notes: string | null;
  device_timestamp: string;
  event_timestamp: string;
  server_timestamp: string;
  idempotency_key: string | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
}
