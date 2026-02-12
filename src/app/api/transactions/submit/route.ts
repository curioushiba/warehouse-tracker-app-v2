import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { TransactionType } from '@/lib/supabase/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      transactionType,
      itemId,
      quantity,
      notes,
      sourceLocationId,
      destinationLocationId,
      deviceTimestamp,
      idempotencyKey,
    } = body as {
      transactionType: TransactionType
      itemId: string
      quantity: number
      notes?: string
      sourceLocationId?: string
      destinationLocationId?: string
      deviceTimestamp?: string
      idempotencyKey?: string
    }

    // Validate required fields
    if (!transactionType || !itemId || quantity === undefined) {
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

    // Call the submit_transaction database function
    const rpcArgs = {
      p_transaction_type: transactionType,
      p_item_id: itemId,
      p_quantity: quantity,
      p_user_id: user.id,
      p_notes: notes || null,
      p_device_timestamp: deviceTimestamp || new Date().toISOString(),
      p_source_location_id: sourceLocationId || null,
      p_destination_location_id: destinationLocationId || null,
      p_idempotency_key: idempotencyKey || null,
    }
    const { data, error } = await supabase.rpc('submit_transaction', rpcArgs as never)

    if (error) {
      // Check if this is an idempotent duplicate
      if (error.code === '23505' && idempotencyKey) {
        // Return success for idempotent retry
        return NextResponse.json({ success: true, message: 'Transaction already processed' })
      }

      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }

    // Revalidate dashboard to show updated recent transactions
    revalidatePath('/admin')

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Transaction submission error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
