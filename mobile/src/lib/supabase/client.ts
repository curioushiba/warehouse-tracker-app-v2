import 'react-native-url-polyfill/auto'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { storage } from '@/lib/storage/mmkv'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// MMKV-backed storage adapter for Supabase auth
const mmkvStorageAdapter = {
  getItem: (key: string) => {
    const value = storage.getString(key)
    return value ?? null
  },
  setItem: (key: string, value: string) => {
    storage.set(key, value)
  },
  removeItem: (key: string) => {
    storage.delete(key)
  },
}

let client: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function createClient() {
  if (!client) {
    client = createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: mmkvStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  }
  return client
}
