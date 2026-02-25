/**
 * Manual database type definitions for the Supabase tables used by the commissary app.
 * These types allow the Supabase client to provide proper type inference on .from() calls,
 * eliminating the need for `as never` / `as any` casts in sync.ts.
 *
 * If you have CLI access, regenerate with: npx supabase gen types typescript
 */

export interface Database {
  public: {
    Tables: {
      inv_items: {
        Row: {
          id: string;
          sku: string;
          name: string;
          barcode: string | null;
          current_stock: number;
          min_stock: number;
          max_stock: number | null;
          unit: string;
          is_commissary: boolean;
          is_archived: boolean;
          updated_at: string;
        };
        Insert: never;
        Update: never;
      };
      inv_production_targets: {
        Row: {
          id: string;
          item_id: string;
          target_quantity: number;
          target_date: string | null;
          priority: number;
          notes: string | null;
          is_recurring: boolean;
          day_of_week: number | null;
        };
        Insert: never;
        Update: never;
      };
      inv_production_logs: {
        Row: {
          id: string;
          item_id: string;
          quantity_produced: number;
          event_timestamp: string;
          status: string;
          waste_quantity: number | null;
          waste_reason: string | null;
          notes: string | null;
          user_id: string;
        };
        Insert: never;
        Update: never;
      };
      inv_categories: {
        Row: {
          id: string;
          name: string;
        };
        Insert: never;
        Update: never;
      };
      sync_errors: {
        Row: {
          id: string;
          transaction_data: Record<string, unknown>;
          error_message: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          transaction_data: Record<string, unknown>;
          error_message: string;
          user_id: string;
        };
        Update: never;
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          name: string | null;
          role: string;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          last_login_at: string | null;
        };
        Insert: never;
        Update: never;
      };
    };
    Functions: {
      submit_production: {
        Args: {
          p_item_id: string;
          p_quantity_produced: number;
          p_user_id: string;
          p_device_timestamp: string;
          p_idempotency_key: string;
          p_waste_quantity: number | null;
          p_waste_reason: string | null;
          p_notes: string | null;
        };
        Returns: void;
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
  };
}
