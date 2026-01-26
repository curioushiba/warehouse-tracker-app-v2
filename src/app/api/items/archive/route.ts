import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

interface ArchiveRequestBody {
  itemId: string
  action: 'archive' | 'restore'
  expectedVersion: number
  idempotencyKey: string
  deviceTimestamp: string
}

// Permanent errors that should not be retried
const PERMANENT_ERRORS = [
  'Not authorized',
  'Admin access required',
  'User account is inactive',
  'Item not found',
]

function isPermanentError(message: string): boolean {
  return PERMANENT_ERRORS.some(err => message.toLowerCase().includes(err.toLowerCase()))
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ArchiveRequestBody
    const { itemId, action, expectedVersion, idempotencyKey, deviceTimestamp } = body

    // Validate required fields
    if (!itemId || !action || expectedVersion === undefined || !idempotencyKey) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields', permanent: true },
        { status: 400 }
      )
    }

    if (action !== 'archive' && action !== 'restore') {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Must be "archive" or "restore"', permanent: true },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', permanent: true },
        { status: 401 }
      )
    }

    // Verify user has admin role and is active
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string; is_active: boolean } | null
    if (!profileData || profileData.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required', permanent: true },
        { status: 403 }
      )
    }

    if (!profileData.is_active) {
      return NextResponse.json(
        { success: false, message: 'User account is inactive', permanent: true },
        { status: 403 }
      )
    }

    // Get current item to check version and current state
    const { data: currentItem, error: fetchError } = await supabase
      .from('inv_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (fetchError || !currentItem) {
      return NextResponse.json(
        { success: false, message: 'Item not found', permanent: true },
        { status: 404 }
      )
    }

    const item = currentItem as {
      id: string
      version: number
      is_archived: boolean
    }

    // Check if already in desired state (idempotent)
    const targetState = action === 'archive'
    if (item.is_archived === targetState) {
      // Already in desired state - return success
      return NextResponse.json({
        success: true,
        item: currentItem,
        wasIdempotent: true,
      })
    }

    // Check for version conflict
    if (item.version !== expectedVersion) {
      return NextResponse.json({
        conflict: true,
        serverVersion: item.version,
        serverIsArchived: item.is_archived,
      })
    }

    // Apply update with version check
    const updateData = {
      is_archived: targetState,
      version: expectedVersion + 1,
      updated_at: new Date().toISOString(),
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from('inv_items')
      .update(updateData as never)
      .eq('id', itemId)
      .eq('version', expectedVersion)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        // Version changed between check and update - fetch current state
        const { data: refreshedData } = await supabase
          .from('inv_items')
          .select('version, is_archived')
          .eq('id', itemId)
          .single()

        const refreshedItem = refreshedData as { version: number; is_archived: boolean } | null
        return NextResponse.json({
          conflict: true,
          serverVersion: refreshedItem?.version ?? expectedVersion + 1,
          serverIsArchived: refreshedItem?.is_archived ?? !targetState,
        })
      }

      return NextResponse.json(
        { success: false, message: updateError.message, permanent: isPermanentError(updateError.message) },
        { status: 400 }
      )
    }

    // Revalidate paths
    revalidatePath('/admin/items')
    revalidatePath(`/admin/items/${itemId}`)

    return NextResponse.json({
      success: true,
      item: updatedItem,
      wasIdempotent: false,
    })
  } catch (error) {
    console.error('Archive item error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', permanent: false },
      { status: 500 }
    )
  }
}
