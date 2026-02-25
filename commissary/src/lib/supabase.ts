import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { secureStorage } from './secure-storage';
import type { Database } from './supabase-types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables.\n' +
    'Copy commissary/.env.example to commissary/.env and fill in:\n' +
    '  EXPO_PUBLIC_SUPABASE_URL=<your-project-url>\n' +
    '  EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>',
  );
}

export const supabase: SupabaseClient<Database> | null =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: secureStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
