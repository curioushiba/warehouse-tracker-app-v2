// Component Size Types
export type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

// Button Types
export type ButtonVariant =
  | "cta"
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "link";

// Input Types
export type InputVariant = "outline" | "filled" | "flushed";

// Alert Types
export type AlertStatus = "info" | "success" | "warning" | "error";
export type AlertVariant = "subtle" | "solid" | "left-accent" | "top-accent";

// Toast Types
export type ToastStatus = AlertStatus;
export type ToastPosition =
  | "top"
  | "top-left"
  | "top-right"
  | "bottom"
  | "bottom-left"
  | "bottom-right";

// Card Types
export type CardVariant = "elevated" | "outline" | "filled" | "spotlight" | "unstyled";

// Modal Types
export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

// Drawer Types
export type DrawerPlacement = "left" | "right" | "top" | "bottom";
export type DrawerSize = "xs" | "sm" | "md" | "lg" | "xl" | "full";

// Tab Types
export type TabVariant = "line" | "enclosed" | "soft-rounded" | "solid-rounded";

// Badge Types
export type BadgeVariant = "solid" | "subtle" | "outline";
export type BadgeColorScheme =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral";

// Stock Level Types
export type StockLevel = "critical" | "low" | "normal" | "overstocked";

// Sync Status Types
export type SyncStatus = "synced" | "syncing" | "pending" | "offline" | "error";

// User Role Types (simplified: admin and employee only)
export type UserRole = "admin" | "employee";

// User Types
export interface User {
  id: string;
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  name: string; // Computed full name
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  createdBy?: string; // Admin who created this employee
  createdAt: string;
  lastLogin?: string;
}

// Item/Product Types
export interface Item {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  subCategory?: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  costPrice: number;
  sellingPrice?: number;
  locationId: string;
  imageUrl?: string;
  barcode?: string;
  qrCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastStockCheck?: string;
}

// Category Types
export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  children?: Category[];
  itemCount: number;
  iconName?: string;
  isActive: boolean;
}

// Location Types (storage areas within the single location)
export interface Location {
  id: string;
  name: string;
  code: string;
  type: "warehouse" | "storefront" | "storage" | "office";
  address?: string;
  isActive: boolean;
}

// Transaction Types
export type TransactionType =
  | "check_in"
  | "check_out"
  | "transfer"
  | "adjustment"
  | "write_off"
  | "return";

export interface Transaction {
  id: string;
  type: TransactionType;
  itemId: string;
  itemName: string;
  itemSku: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  fromLocationId?: string;
  toLocationId?: string;
  userId: string;
  userName: string;
  notes?: string;
  reference?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  syncedAt?: string;
}

// Report Types
export interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  criticalStockItems: number;
  pendingTransactions: number;
  todayTransactions: number;
  totalValue: number;
  recentAlerts: Alert[];
}

export interface Alert {
  id: string;
  type: "low_stock" | "critical_stock" | "sync_error" | "expiring_soon" | "system";
  title: string;
  message: string;
  itemId?: string;
  severity: "low" | "medium" | "high" | "critical";
  isRead: boolean;
  createdAt: string;
}

// Form Types
export interface FormFieldError {
  field: string;
  message: string;
}

// Table Types
export interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

export interface FilterConfig {
  search?: string;
  category?: string;
  status?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Navigation Types
export interface NavItem {
  label: string;
  href?: string;
  icon?: string;
  children?: NavItem[];
  badge?: string | number;
  isActive?: boolean;
  isDisabled?: boolean;
}

// Theme Types
export interface ThemeConfig {
  mode: "light" | "dark" | "system";
  accentColor: string;
  borderRadius: "none" | "sm" | "md" | "lg" | "full";
}
