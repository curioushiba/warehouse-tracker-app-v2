import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { SyncErrorInsert } from '@/lib/supabase/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { transactionData, errorMessage } = body

    if (!transactionData || !errorMessage) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    const insertData: SyncErrorInsert = {
      transaction_data: transactionData,
      error_message: errorMessage,
      user_id: user?.id || null,
      status: 'pending',
    }

    const { data, error } = await supabase
      .from('sync_errors')
      .insert(insertData as never)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Sync error logging failed:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('sync_errors')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
