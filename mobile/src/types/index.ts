// Component Size Types
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

// Button Types
export type ButtonVariant =
  | 'cta'
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'link'

// Alert Types
export type AlertStatus = 'info' | 'success' | 'warning' | 'error'

// Badge Types
export type BadgeVariant = 'solid' | 'subtle' | 'outline'
export type BadgeColorScheme =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'

// Stock Level Types
export type StockLevel = 'critical' | 'low' | 'normal' | 'overstocked'

// Sync Status Types
export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'error'

// User Role Types
export type UserRole = 'admin' | 'employee'

// Card Types
export type CardVariant = 'elevated' | 'outline' | 'filled' | 'unstyled'

// Modal Types
export type ModalSize = 'sm' | 'md' | 'lg' | 'full'

// Theme Types
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system'
  accentColor: string
}
