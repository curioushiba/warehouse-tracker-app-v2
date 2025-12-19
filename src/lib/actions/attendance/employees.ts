'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResult, success, failure, paginatedSuccess, PaginatedResult } from '@/lib/types/action-result'
import type {
  AttEmployee,
  AttEmployeeInsert,
  AttEmployeeUpdate,
  AttEmployeeFilters
} from '@/lib/supabase/attendance-types'

const ATTENDANCE_PATH = '/admin/attendance/employees'

// ============================================
// GET EMPLOYEES (PAGINATED)
// ============================================
export async function getEmployeesPaginated(
  filters?: AttEmployeeFilters
): Promise<ActionResult<PaginatedResult<AttEmployee>>> {
  try {
    const supabase = await createClient()
    const page = filters?.page ?? 1
    const pageSize = filters?.pageSize ?? 20
    const offset = (page - 1) * pageSize

    // Build count query
    let countQuery = supabase
      .from('att_employees')
      .select('id, username, display_name, is_active, created_at, updated_at, last_login_at', { count: 'exact', head: true })

    if (filters?.search) {
      countQuery = countQuery.or(`username.ilike.%${filters.search}%,display_name.ilike.%${filters.search}%`)
    }
    if (filters?.isActive !== undefined) {
      countQuery = countQuery.eq('is_active', filters.isActive)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      return failure(countError.message)
    }

    // Build data query (exclude password_hash)
    let dataQuery = supabase
      .from('att_employees')
      .select('id, username, display_name, is_active, created_at, updated_at, last_login_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (filters?.search) {
      dataQuery = dataQuery.or(`username.ilike.%${filters.search}%,display_name.ilike.%${filters.search}%`)
    }
    if (filters?.isActive !== undefined) {
      dataQuery = dataQuery.eq('is_active', filters.isActive)
    }

    const { data, error } = await dataQuery

    if (error) {
      return failure(error.message)
    }

    return paginatedSuccess(data as AttEmployee[], count ?? 0, page, pageSize)
  } catch {
    return failure('Failed to fetch employees')
  }
}

// ============================================
// GET ALL EMPLOYEES (for dropdowns)
// ============================================
export async function getAllEmployees(): Promise<ActionResult<AttEmployee[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('att_employees')
      .select('id, username, display_name, is_active, created_at, updated_at, last_login_at')
      .eq('is_active', true)
      .order('display_name')

    if (error) {
      return failure(error.message)
    }

    return success(data as AttEmployee[])
  } catch {
    return failure('Failed to fetch employees')
  }
}

// ============================================
// GET EMPLOYEE BY ID
// ============================================
export async function getEmployeeById(id: string): Promise<ActionResult<AttEmployee>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('att_employees')
      .select('id, username, display_name, is_active, created_at, updated_at, last_login_at')
      .eq('id', id)
      .single()

    if (error) {
      return failure(error.message)
    }

    return success(data as AttEmployee)
  } catch {
    return failure('Failed to fetch employee')
  }
}

// ============================================
// CREATE EMPLOYEE
// Uses admin client to hash password via RPC
// ============================================
export async function createEmployee(
  employeeData: AttEmployeeInsert
): Promise<ActionResult<AttEmployee>> {
  try {
    const supabase = createAdminClient()

    // Check username uniqueness
    const { data: existing } = await supabase
      .from('att_employees')
      .select('id')
      .eq('username', employeeData.username.toLowerCase().trim())
      .single()

    if (existing) {
      return failure('Username already exists')
    }

    // Hash password
    const { data: hashResult, error: hashError } = await supabase
      .rpc('hash_attendance_password', { p_password: employeeData.password } as never)

    if (hashError) {
      return failure('Failed to process password')
    }

    // Insert employee
    const { data, error } = await supabase
      .from('att_employees')
      .insert({
        username: employeeData.username.toLowerCase().trim(),
        display_name: employeeData.display_name.trim(),
        password_hash: hashResult,
        is_active: employeeData.is_active ?? true,
      } as never)
      .select('id, username, display_name, is_active, created_at, updated_at, last_login_at')
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath(ATTENDANCE_PATH)
    return success(data as AttEmployee)
  } catch {
    return failure('Failed to create employee')
  }
}

// ============================================
// UPDATE EMPLOYEE
// ============================================
export async function updateEmployee(
  id: string,
  employeeData: AttEmployeeUpdate
): Promise<ActionResult<AttEmployee>> {
  try {
    const supabase = createAdminClient()

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (employeeData.username !== undefined) {
      // Check username uniqueness (excluding current employee)
      const { data: existing } = await supabase
        .from('att_employees')
        .select('id')
        .eq('username', employeeData.username.toLowerCase().trim())
        .neq('id', id)
        .single()

      if (existing) {
        return failure('Username already exists')
      }

      updateData.username = employeeData.username.toLowerCase().trim()
    }

    if (employeeData.display_name !== undefined) {
      updateData.display_name = employeeData.display_name.trim()
    }

    if (employeeData.is_active !== undefined) {
      updateData.is_active = employeeData.is_active
    }

    // Hash new password if provided
    if (employeeData.password) {
      const { data: hashResult, error: hashError } = await supabase
        .rpc('hash_attendance_password', { p_password: employeeData.password } as never)

      if (hashError) {
        return failure('Failed to process password')
      }

      updateData.password_hash = hashResult
    }

    const { data, error } = await supabase
      .from('att_employees')
      .update(updateData as never)
      .eq('id', id)
      .select('id, username, display_name, is_active, created_at, updated_at, last_login_at')
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath(ATTENDANCE_PATH)
    return success(data as AttEmployee)
  } catch {
    return failure('Failed to update employee')
  }
}

// ============================================
// DELETE EMPLOYEE
// ============================================
export async function deleteEmployee(id: string): Promise<ActionResult<null>> {
  try {
    const supabase = createAdminClient()

    // Check for existing records
    const { count } = await supabase
      .from('att_records')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', id)

    if (count && count > 0) {
      return failure('Cannot delete employee with attendance records. Deactivate instead.')
    }

    const { error } = await supabase
      .from('att_employees')
      .delete()
      .eq('id', id)

    if (error) {
      return failure(error.message)
    }

    revalidatePath(ATTENDANCE_PATH)
    return success(null)
  } catch {
    return failure('Failed to delete employee')
  }
}

// ============================================
// TOGGLE EMPLOYEE ACTIVE STATUS
// ============================================
export async function toggleEmployeeActive(id: string): Promise<ActionResult<AttEmployee>> {
  try {
    const supabase = createAdminClient()

    // Get current status
    const { data: current, error: getError } = await supabase
      .from('att_employees')
      .select('is_active')
      .eq('id', id)
      .single() as { data: { is_active: boolean } | null; error: { message: string } | null }

    if (getError || !current) {
      return failure(getError?.message || 'Employee not found')
    }

    // Toggle
    const { data, error } = await supabase
      .from('att_employees')
      .update({ is_active: !current.is_active } as never)
      .eq('id', id)
      .select('id, username, display_name, is_active, created_at, updated_at, last_login_at')
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath(ATTENDANCE_PATH)
    return success(data as AttEmployee)
  } catch {
    return failure('Failed to toggle employee status')
  }
}
