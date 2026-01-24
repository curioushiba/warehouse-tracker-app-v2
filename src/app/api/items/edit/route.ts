import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import type { ItemUpdate } from '@/lib/supabase/types'

interface EditRequestBody {
  itemId: string
  changes: Partial<ItemUpdate>
  expectedVersion: number
  idempotencyKey?: string // Sent by client for future idempotency handling
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as EditRequestBody
    const { itemId, changes, expectedVersion } = body

    // Validate required fields
    if (!itemId || !changes || expectedVersion === undefined) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string; is_active: boolean } | null
    if (!profileData || profileData.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    if (!profileData.is_active) {
      return NextResponse.json(
        { success: false, message: 'User account is inactive' },
        { status: 403 }
      )
    }

    // Get current item to check version
    const { data: currentItem, error: fetchError } = await supabase
      .from('inv_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (fetchError || !currentItem) {
      return NextResponse.json(
        { success: false, message: 'Item not found' },
        { status: 404 }
      )
    }

    const item = currentItem as {
      version: number
      category_id: string | null
      min_stock: number
      max_stock: number | null
      unit_price: number | null
      name: string
      description: string | null
      image_url: string | null
      is_archived: boolean
    }

    // Check for version conflict
    if (item.version !== expectedVersion) {
      return NextResponse.json({
        conflict: true,
        serverVersion: item.version,
        serverValues: {
          category_id: item.category_id,
          min_stock: item.min_stock,
          max_stock: item.max_stock,
          unit_price: item.unit_price,
          name: item.name,
          description: item.description,
          image_url: item.image_url,
          is_archived: item.is_archived,
        },
      })
    }

    // Prepare update data with incremented version
    const updateData = {
      ...changes,
      version: expectedVersion + 1,
      updated_at: new Date().toISOString(),
    }

    // Apply update with version check
    const { data: updatedItem, error: updateError } = await supabase
      .from('inv_items')
      .update(updateData as never)
      .eq('id', itemId)
      .eq('version', expectedVersion)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        // Version changed between check and update
        const { data: refreshedData } = await supabase
          .from('inv_items')
          .select('*')
          .eq('id', itemId)
          .single()

        const refreshedItem = refreshedData as typeof item | null
        return NextResponse.json({
          conflict: true,
          serverVersion: refreshedItem?.version ?? expectedVersion + 1,
          serverValues: refreshedItem ? {
            category_id: refreshedItem.category_id,
            min_stock: refreshedItem.min_stock,
            max_stock: refreshedItem.max_stock,
            unit_price: refreshedItem.unit_price,
            name: refreshedItem.name,
            description: refreshedItem.description,
            image_url: refreshedItem.image_url,
            is_archived: refreshedItem.is_archived,
          } : {},
        })
      }

      return NextResponse.json(
        { success: false, message: updateError.message },
        { status: 400 }
      )
    }

    // Revalidate paths
    revalidatePath('/admin/items')
    revalidatePath(`/admin/items/${itemId}`)

    return NextResponse.json({
      conflict: false,
      item: updatedItem,
    })
  } catch (error) {
    console.error('Item edit error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
