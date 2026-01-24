import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const itemId = formData.get('itemId') as string | null

    if (!file || !itemId) {
      return NextResponse.json(
        { success: false, message: 'Missing file or itemId' },
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

    // Verify item exists
    const { data: itemData, error: itemError } = await supabase
      .from('inv_items')
      .select('id, is_archived')
      .eq('id', itemId)
      .single()

    const item = itemData as { id: string; is_archived: boolean } | null
    if (itemError || !item) {
      return NextResponse.json(
        { success: false, message: 'Item not found' },
        { status: 404 }
      )
    }

    if (item.is_archived) {
      return NextResponse.json(
        { success: false, message: 'Cannot upload image for archived item' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
    const filePath = `${itemId}/${fileName}`

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('item-images')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { success: false, message: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('item-images')
      .getPublicUrl(filePath)

    // Update item with new image URL
    const { error: updateError } = await supabase
      .from('inv_items')
      .update({ image_url: urlData.publicUrl } as never)
      .eq('id', itemId)

    if (updateError) {
      return NextResponse.json(
        { success: false, message: updateError.message },
        { status: 500 }
      )
    }

    // Revalidate paths
    revalidatePath('/admin/items')
    revalidatePath(`/admin/items/${itemId}`)

    return NextResponse.json({
      success: true,
      imageUrl: urlData.publicUrl,
    })
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
