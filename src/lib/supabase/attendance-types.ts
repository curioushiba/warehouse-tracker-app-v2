// ============================================
// ATTENDANCE SYSTEM TYPES
// Mirrors database schema for att_* tables
// ============================================

// ============================================
// ATT_STORES
// ============================================
export interface AttStore {
  id: string
  name: string
  qr_code: string | null
  cooldown_minutes: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AttStoreInsert {
  name: string
  cooldown_minutes?: number
  is_active?: boolean
}

export interface AttStoreUpdate {
  name?: string
  cooldown_minutes?: number
  is_active?: boolean
}

// ============================================
// ATT_EMPLOYEES
// ============================================
export interface AttEmployee {
  id: string
  username: string
  display_name: string
  is_active: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
  // Note: password_hash is never returned to client
}

export interface AttEmployeeInsert {
  username: string
  password: string // Plain text, will be hashed server-side
  display_name: string
  is_active?: boolean
}

export interface AttEmployeeUpdate {
  username?: string
  password?: string // Optional, only if changing password
  display_name?: string
  is_active?: boolean
}

// ============================================
// ATT_RECORDS
// ============================================
export interface AttRecord {
  id: string
  employee_id: string
  store_id: string
  recorded_at: string
  device_info: Record<string, unknown> | null
}

// Joined record for display
export interface AttRecordWithDetails {
  id: string
  employee_id: string
  store_id: string
  recorded_at: string
  device_info: Record<string, unknown> | null
  employee: {
    username: string
    display_name: string
  }
  store: {
    name: string
    qr_code: string | null
  }
}

// ============================================
// ATT_SETTINGS
// ============================================
export interface AttSetting {
  id: string
  key: string
  value: unknown
  updated_at: string
}

// ============================================
// FUNCTION RETURN TYPES
// ============================================
export interface RecordAttendanceResult {
  success: boolean
  error?: string
  record?: {
    id: string
    employee_id: string
    store_id: string
    recorded_at: string
  }
  store_name?: string
  employee_name?: string
  last_record_at?: string
  cooldown_minutes?: number
  minutes_remaining?: number
}

export interface VerifyCredentialsResult {
  success: boolean
  error?: string
  employee?: {
    id: string
    username: string
    display_name: string
  }
}

// ============================================
// FILTER TYPES
// ============================================
export interface AttRecordFilters {
  page?: number
  pageSize?: number
  storeId?: string
  employeeId?: string
  dateFrom?: string
  dateTo?: string
}

export interface AttStoreFilters {
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean
}

export interface AttEmployeeFilters {
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean
}
