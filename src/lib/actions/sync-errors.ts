"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";
import type { SyncError, SyncErrorUpdate, SyncErrorStatus } from "@/lib/supabase/types";

export interface SyncErrorFilters {
  status?: SyncErrorStatus;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Get all sync errors with optional filters
 */
export async function getSyncErrors(
  filters?: SyncErrorFilters
): Promise<ActionResult<SyncError[]>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("sync_errors")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.userId) {
      query = query.eq("user_id", filters.userId);
    }

    if (filters?.startDate) {
      query = query.gte("created_at", filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte("created_at", filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching sync errors:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Unexpected error fetching sync errors:", error);
    return { success: false, error: "Failed to fetch sync errors" };
  }
}

/**
 * Get a single sync error by ID
 */
export async function getSyncErrorById(
  id: string
): Promise<ActionResult<SyncError>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("sync_errors")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching sync error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error fetching sync error:", error);
    return { success: false, error: "Failed to fetch sync error" };
  }
}

/**
 * Retry a sync error by reprocessing the transaction
 */
export async function retrySyncError(
  id: string
): Promise<ActionResult<SyncError>> {
  try {
    const supabase = await createClient();

    // First get the sync error
    const { data: syncErrorData, error: fetchError } = await supabase
      .from("sync_errors")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    // Cast to SyncError type
    const syncError = syncErrorData as unknown as SyncError;

    // Try to reprocess the transaction
    const transactionData = syncError.transaction_data as Record<string, unknown>;

    // Attempt to submit the transaction
    const { error: txError } = await supabase.rpc("submit_transaction", {
      p_transaction_type: transactionData.transaction_type as string,
      p_item_id: transactionData.item_id as string,
      p_quantity: transactionData.quantity as number,
      p_user_id: transactionData.user_id as string,
      p_notes: (transactionData.notes as string) || null,
      p_source_location_id: (transactionData.source_location_id as string) || null,
      p_destination_location_id: (transactionData.destination_location_id as string) || null,
      p_idempotency_key: (transactionData.idempotency_key as string) || null,
      p_device_timestamp: transactionData.device_timestamp as string,
    } as never);

    if (txError) {
      // Update error message with new error
      const { data: updatedError, error: updateError } = await supabase
        .from("sync_errors")
        .update({
          error_message: txError.message,
        } as never)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: false, error: `Retry failed: ${txError.message}` };
    }

    // Transaction succeeded, mark as resolved
    const { data: resolvedError, error: resolveError } = await supabase
      .from("sync_errors")
      .update({
        status: "resolved" as SyncErrorStatus,
        resolution_notes: "Successfully retried and synced",
        resolved_at: new Date().toISOString(),
      } as never)
      .eq("id", id)
      .select()
      .single();

    if (resolveError) {
      return { success: false, error: resolveError.message };
    }

    return { success: true, data: resolvedError };
  } catch (error) {
    console.error("Unexpected error retrying sync error:", error);
    return { success: false, error: "Failed to retry sync error" };
  }
}

/**
 * Dismiss a sync error
 */
export async function dismissSyncError(
  id: string,
  notes?: string
): Promise<ActionResult<SyncError>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("sync_errors")
      .update({
        status: "dismissed" as SyncErrorStatus,
        resolution_notes: notes || "Manually dismissed",
        resolved_at: new Date().toISOString(),
      } as never)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error dismissing sync error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error dismissing sync error:", error);
    return { success: false, error: "Failed to dismiss sync error" };
  }
}

/**
 * Update a sync error
 */
export async function updateSyncError(
  id: string,
  update: SyncErrorUpdate
): Promise<ActionResult<SyncError>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("sync_errors")
      .update(update as never)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating sync error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error updating sync error:", error);
    return { success: false, error: "Failed to update sync error" };
  }
}

/**
 * Get count of pending sync errors
 */
export async function getPendingSyncErrorCount(): Promise<ActionResult<number>> {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from("sync_errors")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    if (error) {
      console.error("Error counting sync errors:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: count || 0 };
  } catch (error) {
    console.error("Unexpected error counting sync errors:", error);
    return { success: false, error: "Failed to count sync errors" };
  }
}

/**
 * Get count of pending sync errors for a specific user
 */
export async function getUserPendingSyncErrorCount(
  userId: string
): Promise<ActionResult<number>> {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from("sync_errors")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("user_id", userId);

    if (error) {
      console.error("Error counting user sync errors:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: count || 0 };
  } catch (error) {
    console.error("Unexpected error counting user sync errors:", error);
    return { success: false, error: "Failed to count sync errors" };
  }
}

/**
 * Get all pending sync errors for a specific user
 */
export async function getUserSyncErrors(
  userId: string
): Promise<ActionResult<SyncError[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("sync_errors")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user sync errors:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Unexpected error fetching user sync errors:", error);
    return { success: false, error: "Failed to fetch sync errors" };
  }
}
