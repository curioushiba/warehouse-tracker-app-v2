'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/supabase/types'

export type ActionResult<T> = {
  success: boolean
  data?: T
  error?: string
}

export async function signIn(
  identifier: string,
  password: string
): Promise<ActionResult<{ user: unknown; session: unknown }>> {
  try {
    const supabase = await createClient()

    // Check if identifier is an email or username
    const isEmail = identifier.includes('@')
    let email = identifier

    if (!isEmail) {
      // Look up email by username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', identifier.toLowerCase())
        .single<{ email: string | null }>()

      if (profileError || !profile?.email) {
        return {
          success: false,
          error: 'Invalid username or password',
        }
      }
      email = profile.email
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      data,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    }
  }
}

export async function signUp(
  username: string,
  email: string,
  password: string,
  firstName?: string,
  lastName?: string
): Promise<ActionResult<{ user: unknown }>> {
  try {
    const supabase = await createClient()

    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .single()

    if (existingUser) {
      return {
        success: false,
        error: 'Username is already taken',
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase(),
          first_name: firstName || '',
          last_name: lastName || '',
          role: 'admin', // Public signup creates admin accounts
        },
      },
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      data: { user: data.user },
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    }
  }
}

export async function signOut(): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    }
  }
}

export async function getCurrentUser(): Promise<
  ActionResult<{ user: unknown; profile: Profile | null } | null>
> {
  try {
    const supabase = await createClient()

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError) {
      return {
        success: false,
        error: userError.message,
      }
    }

    if (!userData.user) {
      return {
        success: true,
        data: null,
      }
    }

    // Fetch the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single()

    // Return user with profile (or null profile if fetch failed)
    return {
      success: true,
      data: {
        user: userData.user,
        profile: profileError ? null : profile,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    }
  }
}

export async function updateLastLogin(userId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() } as never)
      .eq('id', userId)

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    }
  }
}

export async function requestPasswordReset(email: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    }
  }
}

export async function updatePassword(newPassword: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    }
  }
}

export async function signInEmployee(
  username: string,
  password: string
): Promise<ActionResult<{ user: unknown; session: unknown }>> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Look up user by username and verify they're an employee
    // Using admin client to bypass RLS (user isn't authenticated yet)
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('email, role, is_active')
      .eq('username', username.toLowerCase())
      .single<{ email: string | null; role: string; is_active: boolean }>()

    if (profileError || !profile) {
      return {
        success: false,
        error: 'Invalid username or password',
      }
    }

    // Verify the user is an employee
    if (profile.role !== 'employee') {
      return {
        success: false,
        error: 'This login is for employees only. Admins should use the main login page.',
      }
    }

    // Check if account is active
    if (!profile.is_active) {
      return {
        success: false,
        error: 'Your account has been deactivated. Please contact your administrator.',
      }
    }

    // Employees don't have email - use a placeholder email format for Supabase auth
    // The email format is: username@employee.internal
    const employeeEmail = `${username.toLowerCase()}@employee.internal`

    const { data, error } = await supabase.auth.signInWithPassword({
      email: employeeEmail,
      password,
    })

    if (error) {
      return {
        success: false,
        error: 'Invalid username or password',
      }
    }

    return {
      success: true,
      data,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    }
  }
}
