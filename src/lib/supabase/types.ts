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
      locations: {
        Row: {
          id: string
          name: string
          code: string
          type: LocationType | null
          address: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          type?: LocationType | null
          address?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          code?: string
          type?: LocationType | null
          address?: string | null
          is_active?: boolean
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
      alerts: {
        Row: {
          id: string
          type: AlertType
          severity: AlertSeverity
          title: string
          message: string
          item_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          type: AlertType
          severity: AlertSeverity
          title: string
          message: string
          item_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
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
      generate_sku: {
        Args: Record<string, never>
        Returns: string
      }
      generate_hrg_code: {
        Args: Record<string, never>
        Returns: string
      }
      assign_hrg_code: {
        Args: { p_item_id: string }
        Returns: {
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
        }[]
      }
      generate_pt_code: {
        Args: Record<string, never>
        Returns: string
      }
      assign_pt_code: {
        Args: { p_item_id: string }
        Returns: {
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
        }[]
      }
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
          source_location_id: string | null
          destination_location_id: string | null
          user_id: string
          notes: string | null
          device_timestamp: string
          server_timestamp: string
          sync_status: SyncStatus
          idempotency_key: string | null
        }
      }
    }
  }
}

// Helper types for easier use
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Category = Database['public']['Tables']['inv_categories']['Row']
export type CategoryInsert = Database['public']['Tables']['inv_categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['inv_categories']['Update']

export type Location = Database['public']['Tables']['locations']['Row']
export type LocationInsert = Database['public']['Tables']['locations']['Insert']
export type LocationUpdate = Database['public']['Tables']['locations']['Update']

export type Item = Database['public']['Tables']['inv_items']['Row']
export type ItemInsert = Database['public']['Tables']['inv_items']['Insert']
export type ItemUpdate = Database['public']['Tables']['inv_items']['Update']

export type Transaction = Database['public']['Tables']['inv_transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['inv_transactions']['Insert']

export type Alert = Database['public']['Tables']['alerts']['Row']
export type AlertInsert = Database['public']['Tables']['alerts']['Insert']

export type SyncError = Database['public']['Tables']['sync_errors']['Row']
export type SyncErrorInsert = Database['public']['Tables']['sync_errors']['Insert']
export type SyncErrorUpdate = Database['public']['Tables']['sync_errors']['Update']
