'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { ActionResult, success, failure } from '@/lib/types/action-result'
import type { VerifyCredentialsResult } from '@/lib/supabase/attendance-types'

// ============================================
// VERIFY ATTENDANCE CREDENTIALS
// Called during clock-in login flow
// ============================================
export async function verifyAttendanceCredentials(
  username: string,
  password: string
): Promise<ActionResult<VerifyCredentialsResult>> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .rpc('verify_attendance_credentials', {
        p_username: username,
        p_password: password,
      } as never)

    if (error) {
      return failure(error.message)
    }

    return success(data as VerifyCredentialsResult)
  } catch {
    return failure('Failed to verify credentials')
  }
}

// ============================================
// GET EMPLOYEE BY ID (for session validation)
// ============================================
export async function getAttendanceEmployee(
  employeeId: string
): Promise<ActionResult<{ id: string; username: string; display_name: string; is_active: boolean } | null>> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('att_employees')
      .select('id, username, display_name, is_active')
      .eq('id', employeeId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return success(null)
      }
      return failure(error.message)
    }

    return success(data)
  } catch {
    return failure('Failed to fetch employee')
  }
}
