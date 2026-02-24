export type UserRole = 'admin' | 'employee';

export type ProductionStatus = 'completed' | 'cancelled';

export function isStockInType(type: string): boolean {
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

export interface CommissaryItem {
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
  is_commissary: boolean;
  category_name: string | null;
  updated_at: string;
}

export interface ProductionTarget {
  id: string;
  item_id: string;
  target_quantity: number;
  target_date: string;
  priority: number;
  is_recurring: boolean;
  day_of_week: number | null;
  notes: string | null;
}

export interface ProductionLog {
  id: string;
  item_id: string;
  quantity_produced: number;
  expected_quantity: number | null;
  waste_quantity: number;
  waste_reason: string | null;
  status: ProductionStatus;
  user_id: string;
  notes: string | null;
  device_timestamp: string;
  event_timestamp: string;
  server_timestamp: string;
  idempotency_key: string | null;
}

export interface ProductionRecommendation {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  min_stock: number;
  max_stock: number | null;
  unit: string;
  daily_consumption_rate: number;
  days_of_stock: number | null;
  deficit: number;
  target_today: number;
  priority: number;
  produced_today: number;
  remaining_target: number;
}

export type PriorityLevel = 'CRITICAL' | 'URGENT' | 'HIGH' | 'NORMAL';

export function getPriorityLevel(rec: ProductionRecommendation): PriorityLevel {
  if (rec.current_stock === 0 && rec.daily_consumption_rate > 0) return 'CRITICAL';
  if (rec.days_of_stock !== null && rec.days_of_stock <= 1) return 'URGENT';
  if (rec.priority >= 80) return 'URGENT';
  if (rec.days_of_stock !== null && rec.days_of_stock <= 3) return 'HIGH';
  if (rec.deficit > 0) return 'HIGH';
  if (rec.remaining_target > 0) return 'HIGH';
  return 'NORMAL';
}

export function getPriorityColor(level: PriorityLevel): { bg: string; text: string } {
  switch (level) {
    case 'CRITICAL': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' };
    case 'URGENT': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' };
    case 'HIGH': return { bg: 'rgba(234, 179, 8, 0.15)', text: '#EAB308' };
    case 'NORMAL': return { bg: 'rgba(107, 114, 128, 0.15)', text: '#6B7280' };
  }
}
