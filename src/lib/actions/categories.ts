'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Category, CategoryInsert, CategoryUpdate } from '@/lib/supabase/types'
import { type ActionResult, success, failure } from '@/lib/types/action-result'

// Re-export for backwards compatibility
export type { ActionResult } from '@/lib/types/action-result'

/**
 * Get all categories ordered by name
 */
export async function getCategories(): Promise<ActionResult<Category[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('inv_categories')
      .select('*')
      .order('name')

    if (error) {
      return failure(error.message)
    }

    return success(data ?? [])
  } catch (err) {
    return failure('Failed to fetch categories')
  }
}

/**
 * Get a single category by ID
 */
export async function getCategoryById(id: string): Promise<ActionResult<Category>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('inv_categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return failure(error.message)
    }

    return success(data)
  } catch (err) {
    return failure('Failed to fetch category')
  }
}

/**
 * Create a new category
 */
export async function createCategory(data: CategoryInsert): Promise<ActionResult<Category>> {
  try {
    const supabase = await createClient()

    const { data: category, error } = await supabase
      .from('inv_categories')
      .insert(data as never)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/categories')
    revalidatePath('/items')
    return success(category)
  } catch (err) {
    return failure('Failed to create category')
  }
}

/**
 * Update an existing category
 */
export async function updateCategory(
  id: string,
  data: CategoryUpdate
): Promise<ActionResult<Category>> {
  try {
    const supabase = await createClient()

    const { data: category, error } = await supabase
      .from('inv_categories')
      .update(data as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/categories')
    revalidatePath('/items')
    return success(category)
  } catch (err) {
    return failure('Failed to update category')
  }
}

/**
 * Delete a category (only if no items are associated)
 */
export async function deleteCategory(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    // First check if there are any items in this category
    const { count, error: countError } = await supabase
      .from('inv_items')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)

    if (countError) {
      return failure(countError.message)
    }

    if (count && count > 0) {
      return failure(`Cannot delete category: ${count} items are associated with this category`)
    }

    // Safe to delete
    const { error } = await supabase
      .from('inv_categories')
      .delete()
      .eq('id', id)

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/categories')
    revalidatePath('/items')

    return success(undefined)
  } catch (err) {
    return failure('Failed to delete category')
  }
}

/**
 * Get a category by exact name
 */
export async function getCategoryByName(name: string): Promise<ActionResult<Category>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('inv_categories')
      .select('*')
      .eq('name', name)
      .single()

    if (error) {
      return failure(error.code === 'PGRST116' ? `Category "${name}" not found` : error.message)
    }

    return success(data)
  } catch (err) {
    return failure('Failed to fetch category by name')
  }
}

/**
 * Get or create a category by name
 */
export async function getOrCreateCategory(name: string, description?: string): Promise<ActionResult<Category>> {
  try {
    const supabase = await createClient()

    // Try to find existing
    const { data: existing } = await supabase
      .from('inv_categories')
      .select('*')
      .eq('name', name)
      .single()

    if (existing) {
      return success(existing)
    }

    // Create new
    const { data: created, error } = await supabase
      .from('inv_categories')
      .insert({ name, description: description || null } as never)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/categories')
    revalidatePath('/items')
    return success(created)
  } catch (err) {
    return failure('Failed to get or create category')
  }
}

/**
 * Get the count of items in a category
 */
export async function getCategoryItemCount(id: string): Promise<ActionResult<number>> {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('inv_items')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)

    if (error) {
      return failure(error.message)
    }

    return success(count ?? 0)
  } catch (err) {
    return failure('Failed to get category item count')
  }
}
