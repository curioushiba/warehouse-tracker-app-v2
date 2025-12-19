'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ActionResult, success, failure, paginatedSuccess, PaginatedResult } from '@/lib/types/action-result'
import type {
  AttRecord,
  AttRecordWithDetails,
  AttRecordFilters,
  RecordAttendanceResult
} from '@/lib/supabase/attendance-types'

// ============================================
// GET RECORDS (PAGINATED WITH DETAILS)
// ============================================
export async function getRecordsPaginated(
  filters?: AttRecordFilters
): Promise<ActionResult<PaginatedResult<AttRecordWithDetails>>> {
  try {
    const supabase = await createClient()
    const page = filters?.page ?? 1
    const pageSize = filters?.pageSize ?? 50
    const offset = (page - 1) * pageSize

    // Build count query
    let countQuery = supabase
      .from('att_records')
      .select('*', { count: 'exact', head: true })

    if (filters?.storeId) {
      countQuery = countQuery.eq('store_id', filters.storeId)
    }
    if (filters?.employeeId) {
      countQuery = countQuery.eq('employee_id', filters.employeeId)
    }
    if (filters?.dateFrom) {
      countQuery = countQuery.gte('recorded_at', filters.dateFrom)
    }
    if (filters?.dateTo) {
      // Add 1 day to include the entire end date
      const endDate = new Date(filters.dateTo)
      endDate.setDate(endDate.getDate() + 1)
      countQuery = countQuery.lt('recorded_at', endDate.toISOString())
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      return failure(countError.message)
    }

    // Build data query with joins
    let dataQuery = supabase
      .from('att_records')
      .select(`
        id,
        employee_id,
        store_id,
        recorded_at,
        device_info,
        employee:att_employees!employee_id (
          username,
          display_name
        ),
        store:att_stores!store_id (
          name,
          qr_code
        )
      `)
      .order('recorded_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (filters?.storeId) {
      dataQuery = dataQuery.eq('store_id', filters.storeId)
    }
    if (filters?.employeeId) {
      dataQuery = dataQuery.eq('employee_id', filters.employeeId)
    }
    if (filters?.dateFrom) {
      dataQuery = dataQuery.gte('recorded_at', filters.dateFrom)
    }
    if (filters?.dateTo) {
      const endDate = new Date(filters.dateTo)
      endDate.setDate(endDate.getDate() + 1)
      dataQuery = dataQuery.lt('recorded_at', endDate.toISOString())
    }

    const { data, error } = await dataQuery

    if (error) {
      return failure(error.message)
    }

    // Transform the data to match expected type
    const records: AttRecordWithDetails[] = (data ?? []).map((record: {
      id: string
      employee_id: string
      store_id: string
      recorded_at: string
      device_info: Record<string, unknown> | null
      employee: { username: string; display_name: string } | null
      store: { name: string; qr_code: string | null } | null
    }) => ({
      id: record.id,
      employee_id: record.employee_id,
      store_id: record.store_id,
      recorded_at: record.recorded_at,
      device_info: record.device_info,
      employee: record.employee ?? { username: 'Unknown', display_name: 'Unknown' },
      store: record.store ?? { name: 'Unknown', qr_code: null },
    }))

    return paginatedSuccess(records, count ?? 0, page, pageSize)
  } catch {
    return failure('Failed to fetch records')
  }
}

// ============================================
// GET RECORDS FOR EMPLOYEE (for clock-in history)
// ============================================
export async function getEmployeeRecords(
  employeeId: string,
  limit: number = 10
): Promise<ActionResult<AttRecordWithDetails[]>> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('att_records')
      .select(`
        id,
        employee_id,
        store_id,
        recorded_at,
        device_info,
        employee:att_employees!employee_id (
          username,
          display_name
        ),
        store:att_stores!store_id (
          name,
          qr_code
        )
      `)
      .eq('employee_id', employeeId)
      .order('recorded_at', { ascending: false })
      .limit(limit)

    if (error) {
      return failure(error.message)
    }

    const records: AttRecordWithDetails[] = (data ?? []).map((record: {
      id: string
      employee_id: string
      store_id: string
      recorded_at: string
      device_info: Record<string, unknown> | null
      employee: { username: string; display_name: string } | null
      store: { name: string; qr_code: string | null } | null
    }) => ({
      id: record.id,
      employee_id: record.employee_id,
      store_id: record.store_id,
      recorded_at: record.recorded_at,
      device_info: record.device_info,
      employee: record.employee ?? { username: 'Unknown', display_name: 'Unknown' },
      store: record.store ?? { name: 'Unknown', qr_code: null },
    }))

    return success(records)
  } catch {
    return failure('Failed to fetch employee records')
  }
}

// ============================================
// RECORD ATTENDANCE (CLOCK IN)
// Uses RPC function with cooldown check
// ============================================
export async function recordAttendance(
  employeeId: string,
  storeId: string,
  deviceInfo?: Record<string, unknown>
): Promise<ActionResult<RecordAttendanceResult>> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .rpc('record_attendance', {
        p_employee_id: employeeId,
        p_store_id: storeId,
        p_device_info: deviceInfo ?? null,
      } as never)

    if (error) {
      return failure(error.message)
    }

    // The RPC returns a JSONB object
    const result = data as RecordAttendanceResult

    if (!result.success) {
      // Return the detailed error from the function
      return success(result)
    }

    return success(result)
  } catch {
    return failure('Failed to record attendance')
  }
}

// ============================================
// GET LAST RECORD FOR EMPLOYEE
// ============================================
export async function getLastRecord(
  employeeId: string
): Promise<ActionResult<AttRecord | null>> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('att_records')
      .select('*')
      .eq('employee_id', employeeId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No records found
        return success(null)
      }
      return failure(error.message)
    }

    return success(data as AttRecord)
  } catch {
    return failure('Failed to fetch last record')
  }
}

// ============================================
// GET RECORDS COUNT BY DATE RANGE
// For dashboard stats
// ============================================
export async function getRecordsCountByRange(
  dateFrom: string,
  dateTo: string
): Promise<ActionResult<number>> {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('att_records')
      .select('*', { count: 'exact', head: true })
      .gte('recorded_at', dateFrom)
      .lt('recorded_at', dateTo)

    if (error) {
      return failure(error.message)
    }

    return success(count ?? 0)
  } catch {
    return failure('Failed to count records')
  }
}
