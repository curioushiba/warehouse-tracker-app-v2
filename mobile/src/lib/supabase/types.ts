export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'employee'
export type LocationType = 'warehouse' | 'storefront' | 'storage' | 'office'
export type TransactionType = 'check_in' | 'check_out' | 'transfer' | 'adjustment' | 'write_off' | 'return'
export type SyncStatus = 'synced' | 'pending' | 'error'
export type AlertType = 'low_stock' | 'expiring' | 'audit_required' | 'system' | 'user'
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'
export type SyncErrorStatus = 'pending' | 'resolved' | 'dismissed'

export interface Database {
  public: {
    Enums: {
      user_role: UserRole
      location_type: LocationType
      transaction_type: TransactionType
      sync_status: SyncStatus
      alert_type: AlertType
      alert_severity: AlertSeverity
      sync_error_status: SyncErrorStatus
    }
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          email: string | null
          first_name: string | null
          last_name: string | null
          name: string | null
          role: UserRole
          avatar_url: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          last_login_at: string | null
        }
        Insert: {
          id: string
          username: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          role?: UserRole
          avatar_url?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          last_login_at?: string | null
        }
        Update: {
          id?: string
          username?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          role?: UserRole
          avatar_url?: string | null
          is_active?: boolean
          created_by?: string | null
          last_login_at?: string | null
        }
      }
      inv_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          parent_id?: string | null
        }
      }
      inv_items: {
        Row: {
          id: string
          sku: string
          name: string
          description: string | null
          category_id: string | null
          location_id: string | null
          unit: string
          current_stock: number
          min_stock: number
          max_stock: number | null
          unit_price: number | null
          barcode: string | null
          image_url: string | null
          is_archived: boolean
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sku?: string
          name: string
          description?: string | null
          category_id?: string | null
          location_id?: string | null
          unit?: string
          current_stock?: number
          min_stock?: number
          max_stock?: number | null
          unit_price?: number | null
          barcode?: string | null
          image_url?: string | null
          is_archived?: boolean
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          sku?: string
          name?: string
          description?: string | null
          category_id?: string | null
          location_id?: string | null
          unit?: string
          current_stock?: number
          min_stock?: number
          max_stock?: number | null
          unit_price?: number | null
          barcode?: string | null
          image_url?: string | null
          is_archived?: boolean
          version?: number
          updated_at?: string
        }
      }
      inv_transactions: {
        Row: {
          id: string
          transaction_type: TransactionType
          item_id: string
          quantity: number
          stock_before: number | null
          stock_after: number | null
          source_location_id: string | null
          destination_location_id: string | null
          user_id: string
          notes: string | null
          device_timestamp: string
          event_timestamp: string
          server_timestamp: string
          sync_status: SyncStatus
          idempotency_key: string | null
        }
        Insert: {
          id?: string
          transaction_type: TransactionType
          item_id: string
          quantity: number
          stock_before?: number | null
          stock_after?: number | null
          source_location_id?: string | null
          destination_location_id?: string | null
          user_id: string
          notes?: string | null
          device_timestamp: string
          server_timestamp?: string
          sync_status?: SyncStatus
          idempotency_key?: string | null
        }
        Update: {
          transaction_type?: TransactionType
          quantity?: number
          notes?: string | null
          sync_status?: SyncStatus
        }
      }
      fg_items: {
        Row: {
          id: string
          sku: string
          name: string
          description: string | null
          category_id: string | null
          location_id: string | null
          unit: string
          current_stock: number
          min_stock: number
          max_stock: number | null
          unit_price: number | null
          barcode: string | null
          image_url: string | null
          is_archived: boolean
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sku?: string
          name: string
          description?: string | null
          category_id?: string | null
          location_id?: string | null
          unit?: string
          current_stock?: number
          min_stock?: number
          max_stock?: number | null
          unit_price?: number | null
          barcode?: string | null
          image_url?: string | null
          is_archived?: boolean
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          sku?: string
          name?: string
          description?: string | null
          category_id?: string | null
          location_id?: string | null
          unit?: string
          current_stock?: number
          min_stock?: number
          max_stock?: number | null
          unit_price?: number | null
          barcode?: string | null
          image_url?: string | null
          is_archived?: boolean
          version?: number
          updated_at?: string
        }
      }
      fg_transactions: {
        Row: {
          id: string
          transaction_type: TransactionType
          item_id: string
          quantity: number
          stock_before: number | null
          stock_after: number | null
          source_location_id: string | null
          destination_location_id: string | null
          user_id: string
          notes: string | null
          device_timestamp: string
          event_timestamp: string
          server_timestamp: string
          sync_status: SyncStatus
          idempotency_key: string | null
        }
        Insert: {
          id?: string
          transaction_type: TransactionType
          item_id: string
          quantity: number
          stock_before?: number | null
          stock_after?: number | null
          source_location_id?: string | null
          destination_location_id?: string | null
          user_id: string
          notes?: string | null
          device_timestamp: string
          server_timestamp?: string
          sync_status?: SyncStatus
          idempotency_key?: string | null
        }
        Update: {
          transaction_type?: TransactionType
          quantity?: number
          notes?: string | null
          sync_status?: SyncStatus
        }
      }
      cm_items: {
        Row: {
          id: string
          sku: string
          name: string
          description: string | null
          category_id: string | null
          location_id: string | null
          unit: string
          current_stock: number
          min_stock: number
          max_stock: number | null
          unit_price: number | null
          barcode: string | null
          image_url: string | null
          is_archived: boolean
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sku?: string
          name: string
          description?: string | null
          category_id?: string | null
          location_id?: string | null
          unit?: string
          current_stock?: number
          min_stock?: number
          max_stock?: number | null
          unit_price?: number | null
          barcode?: string | null
          image_url?: string | null
          is_archived?: boolean
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          sku?: string
          name?: string
          description?: string | null
          category_id?: string | null
          location_id?: string | null
          unit?: string
          current_stock?: number
          min_stock?: number
          max_stock?: number | null
          unit_price?: number | null
          barcode?: string | null
          image_url?: string | null
          is_archived?: boolean
          version?: number
          updated_at?: string
        }
      }
      cm_transactions: {
        Row: {
          id: string
          transaction_type: TransactionType
          item_id: string
          quantity: number
          stock_before: number | null
          stock_after: number | null
          source_location_id: string | null
          destination_location_id: string | null
          user_id: string
          notes: string | null
          device_timestamp: string
          event_timestamp: string
          server_timestamp: string
          sync_status: SyncStatus
          idempotency_key: string | null
        }
        Insert: {
          id?: string
          transaction_type: TransactionType
          item_id: string
          quantity: number
          stock_before?: number | null
          stock_after?: number | null
          source_location_id?: string | null
          destination_location_id?: string | null
          user_id: string
          notes?: string | null
          device_timestamp: string
          server_timestamp?: string
          sync_status?: SyncStatus
          idempotency_key?: string | null
        }
        Update: {
          transaction_type?: TransactionType
          quantity?: number
          notes?: string | null
          sync_status?: SyncStatus
        }
      }
      sync_errors: {
        Row: {
          id: string
          transaction_data: Json
          error_message: string
          status: SyncErrorStatus
          resolution_notes: string | null
          user_id: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          transaction_data: Json
          error_message: string
          status?: SyncErrorStatus
          resolution_notes?: string | null
          user_id?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          status?: SyncErrorStatus
          resolution_notes?: string | null
          resolved_at?: string | null
        }
      }
    }
    Views: {}
    Functions: {
      submit_transaction: {
        Args: {
          p_transaction_type: TransactionType
          p_item_id: string
          p_quantity: number
          p_user_id: string
          p_notes: string | null
          p_source_location_id: string | null
          p_destination_location_id: string | null
          p_idempotency_key: string | null
          p_device_timestamp: string
        }
        Returns: {
          id: string
          transaction_type: TransactionType
          item_id: string
          quantity: number
          stock_before: number | null
          stock_after: number | null
        }
      }
      submit_fg_transaction: {
        Args: {
          p_transaction_type: TransactionType
          p_item_id: string
          p_quantity: number
          p_user_id: string
          p_notes: string | null
          p_source_location_id: string | null
          p_destination_location_id: string | null
          p_idempotency_key: string | null
          p_device_timestamp: string
        }
        Returns: {
          id: string
          transaction_type: TransactionType
          item_id: string
          quantity: number
          stock_before: number | null
          stock_after: number | null
        }
      }
      submit_cm_transaction: {
        Args: {
          p_transaction_type: TransactionType
          p_item_id: string
          p_quantity: number
          p_user_id: string
          p_notes: string | null
          p_source_location_id: string | null
          p_destination_location_id: string | null
          p_idempotency_key: string | null
          p_device_timestamp: string
        }
        Returns: {
          id: string
          transaction_type: TransactionType
          item_id: string
          quantity: number
          stock_before: number | null
          stock_after: number | null
        }
      }
    }
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type Category = Database['public']['Tables']['inv_categories']['Row']
export type Item = Database['public']['Tables']['inv_items']['Row']
export type ItemInsert = Database['public']['Tables']['inv_items']['Insert']
export type ItemUpdate = Database['public']['Tables']['inv_items']['Update']
export type Transaction = Database['public']['Tables']['inv_transactions']['Row']
export type CmItem = Database['public']['Tables']['cm_items']['Row']
export type CmTransaction = Database['public']['Tables']['cm_transactions']['Row']
export type SyncError = Database['public']['Tables']['sync_errors']['Row']
export type SyncErrorInsert = Database['public']['Tables']['sync_errors']['Insert']
