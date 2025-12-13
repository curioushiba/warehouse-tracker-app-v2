'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Location, LocationInsert, LocationUpdate } from '@/lib/supabase/types'
import { type ActionResult, success, failure } from '@/lib/types/action-result'

// Re-export for backwards compatibility
export type { ActionResult } from '@/lib/types/action-result'

/**
 * Get all locations, optionally filtered by active status
 */
export async function getLocations(activeOnly?: boolean): Promise<ActionResult<Location[]>> {
  try {
    const supabase = await createClient()

    let query = supabase.from('locations').select('*')

    if (activeOnly === true) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query.order('name')

    if (error) {
      return failure(error.message)
    }

    return success(data ?? [])
  } catch (err) {
    return failure('Failed to fetch locations')
  }
}

/**
 * Get a single location by ID
 */
export async function getLocationById(id: string): Promise<ActionResult<Location>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return failure(error.message)
    }

    return success(data)
  } catch (err) {
    return failure('Failed to fetch location')
  }
}

/**
 * Get a single location by code
 */
export async function getLocationByCode(code: string): Promise<ActionResult<Location>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('code', code)
      .single()

    if (error) {
      return failure(error.message)
    }

    return success(data)
  } catch (err) {
    return failure('Failed to fetch location')
  }
}

/**
 * Create a new location
 */
export async function createLocation(data: LocationInsert): Promise<ActionResult<Location>> {
  try {
    const supabase = await createClient()

    const { data: location, error } = await supabase
      .from('locations')
      .insert(data as never)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/locations')
    revalidatePath('/items')
    return success(location)
  } catch (err) {
    return failure('Failed to create location')
  }
}

/**
 * Update an existing location
 */
export async function updateLocation(
  id: string,
  data: LocationUpdate
): Promise<ActionResult<Location>> {
  try {
    const supabase = await createClient()

    const { data: location, error } = await supabase
      .from('locations')
      .update(data as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/locations')
    revalidatePath('/items')
    return success(location)
  } catch (err) {
    return failure('Failed to update location')
  }
}

/**
 * Deactivate a location (soft delete)
 */
export async function deactivateLocation(id: string): Promise<ActionResult<Location>> {
  try {
    const supabase = await createClient()

    const { data: location, error } = await supabase
      .from('locations')
      .update({ is_active: false } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/locations')
    revalidatePath('/items')
    return success(location)
  } catch (err) {
    return failure('Failed to deactivate location')
  }
}

/**
 * Activate a location (reactivate from soft delete)
 */
export async function activateLocation(id: string): Promise<ActionResult<Location>> {
  try {
    const supabase = await createClient()

    const { data: location, error } = await supabase
      .from('locations')
      .update({ is_active: true } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/locations')
    revalidatePath('/items')
    return success(location)
  } catch (err) {
    return failure('Failed to activate location')
  }
}
