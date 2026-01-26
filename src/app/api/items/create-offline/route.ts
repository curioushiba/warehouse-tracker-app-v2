import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import type { ItemInsert } from '@/lib/supabase/types'

interface CreateOfflineRequestBody {
  id: string                    // Client-generated UUID
  itemData: Partial<ItemInsert>
  idempotencyKey: string
  deviceTimestamp: string
}

// Permanent errors that should not be retried
const PERMANENT_ERRORS = [
  'Not authorized',
  'Admin access required',
  'User account is inactive',
  'duplicate key value',
  'already exists',
]

function isPermanentError(message: string): boolean {
  return PERMANENT_ERRORS.some(err => message.toLowerCase().includes(err.toLowerCase()))
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CreateOfflineRequestBody
    const { id, itemData, idempotencyKey, deviceTimestamp } = body

    // Validate required fields
    if (!id || !itemData || !idempotencyKey) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields', permanent: true },
        { status: 400 }
      )
    }

    if (!itemData.name || typeof itemData.name !== 'string' || !itemData.name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Item name is required', permanent: true },
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

    // Check idempotency - if item with this ID already exists, return it
    const { data: existingItem } = await supabase
      .from('inv_items')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (existingItem) {
      // Item already created (previous sync succeeded but client didn't get response)
      return NextResponse.json({
        success: true,
        item: existingItem,
        wasIdempotent: true,
      })
    }

    // Prepare item data for insertion
    // Server will generate SKU via database default (generate_sku() function)
    const insertData: ItemInsert = {
      id, // Use client-provided UUID
      name: itemData.name.trim(),
      description: itemData.description?.trim() || null,
      category_id: itemData.category_id || null,
      location_id: itemData.location_id || null,
      unit: itemData.unit || 'pcs',
      current_stock: typeof itemData.current_stock === 'number' ? itemData.current_stock : 0,
      min_stock: typeof itemData.min_stock === 'number' ? itemData.min_stock : 0,
      max_stock: itemData.max_stock ?? null,
      unit_price: itemData.unit_price ?? null,
      barcode: itemData.barcode?.trim() || null,
      image_url: itemData.image_url || null,
      is_archived: false,
      version: 1,
    }

    // Insert the item
    const { data: createdItem, error: insertError } = await supabase
      .from('inv_items')
      .insert(insertData as never)
      .select()
      .single()

    if (insertError) {
      const isPermanent = isPermanentError(insertError.message)
      return NextResponse.json(
        { success: false, message: insertError.message, permanent: isPermanent },
        { status: isPermanent ? 400 : 500 }
      )
    }

    // Revalidate paths
    revalidatePath('/admin/items')

    return NextResponse.json({
      success: true,
      item: createdItem,
      wasIdempotent: false,
    })
  } catch (error) {
    console.error('Create offline item error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', permanent: false },
      { status: 500 }
    )
  }
}
