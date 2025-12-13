'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Profile, ProfileUpdate, UserRole } from '@/lib/supabase/types'
import { type ActionResult, success, failure } from '@/lib/types/action-result'

// Re-export for backwards compatibility
export type { ActionResult } from '@/lib/types/action-result'

export interface CreateUserInput {
  username: string
  email?: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
}

export async function getUsers(): Promise<ActionResult<Profile[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return failure(error.message)
    }

    return success(data ?? [])
  } catch (err) {
    return failure('Failed to fetch users')
  }
}

export async function getUserById(id: string): Promise<ActionResult<Profile>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return failure(error.message)
    }

    return success(data)
  } catch (err) {
    return failure('Failed to fetch user')
  }
}

export async function createUser(input: CreateUserInput): Promise<ActionResult<Profile>> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get current user (admin) for created_by tracking
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return failure('Not authenticated')
    }

    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', input.username.toLowerCase())
      .single()

    if (existingUser) {
      return failure('Username is already taken')
    }

    // For employees, use a placeholder email format for Supabase auth
    // Admins use their real email, employees use username@employee.internal
    const authEmail = input.role === 'employee'
      ? `${input.username.toLowerCase()}@employee.internal`
      : input.email

    if (!authEmail) {
      return failure('Email is required for admin accounts')
    }

    // Create user in auth.users via Supabase Admin API
    // Using admin client with service role key
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        username: input.username.toLowerCase(),
        first_name: input.firstName,
        last_name: input.lastName,
        role: input.role,
        created_by: currentUser.id,
      },
    })

    if (authError) {
      return failure(authError.message)
    }

    // Profile is created automatically by the trigger, but we need to update created_by
    // The trigger doesn't handle created_by, so update it here
    // Using admin client to bypass RLS
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .update({
        created_by: currentUser.id,
        // For employees, set email to null (not the placeholder)
        email: input.role === 'employee' ? null : input.email
      } as never)
      .eq('id', authData.user.id)
      .select()
      .single()

    if (profileError) {
      return failure(profileError.message)
    }

    revalidatePath('/admin/users')
    return success(profile)
  } catch (err) {
    return failure('Failed to create user')
  }
}

export async function updateUser(id: string, data: ProfileUpdate): Promise<ActionResult<Profile>> {
  try {
    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(data as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/admin/users')
    return success(profile)
  } catch (err) {
    return failure('Failed to update user')
  }
}

export async function deactivateUser(id: string): Promise<ActionResult<Profile>> {
  try {
    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ is_active: false } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/admin/users')
    return success(profile)
  } catch (err) {
    return failure('Failed to deactivate user')
  }
}

export async function activateUser(id: string): Promise<ActionResult<Profile>> {
  try {
    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ is_active: true } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/admin/users')
    return success(profile)
  } catch (err) {
    return failure('Failed to activate user')
  }
}

export async function updateUserRole(id: string, role: UserRole): Promise<ActionResult<Profile>> {
  try {
    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ role } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/admin/users')
    return success(profile)
  } catch (err) {
    return failure('Failed to update user role')
  }
}

export async function resetUserPassword(id: string, newPassword: string): Promise<ActionResult<void>> {
  try {
    const adminClient = createAdminClient()

    // Use admin API to update user password
    const { error } = await adminClient.auth.admin.updateUserById(id, {
      password: newPassword,
    })

    if (error) {
      return failure(error.message)
    }

    return success(undefined)
  } catch (err) {
    return failure('Failed to reset password')
  }
}

export async function deleteUser(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Check if user has any transactions
    const { data: transactions, error: txError } = await supabase
      .from('inv_transactions')
      .select('id')
      .eq('user_id', id)
      .limit(1)

    if (txError) {
      return failure(txError.message)
    }

    // If user has transactions, cannot delete - must deactivate instead
    if (transactions && transactions.length > 0) {
      return failure('Cannot delete user with transaction history. Deactivate the account instead.')
    }

    // Delete from auth.users (profile will be deleted by cascade)
    // Using admin client with service role key
    const { error } = await adminClient.auth.admin.deleteUser(id)

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/admin/users')
    return success(undefined)
  } catch (err) {
    return failure('Failed to delete user')
  }
}
