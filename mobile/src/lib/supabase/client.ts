import 'react-native-url-polyfill/auto'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Database } from './types'

let client: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function createClient() {
  if (!client) {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      throw new Error(
        'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy mobile/.env.local.example to mobile/.env.local and fill in your Supabase credentials.'
      )
    }

    client = createSupabaseClient<Database>(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  }
  return client
}
