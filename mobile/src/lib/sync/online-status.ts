import { supabase } from '@/lib/supabase';

/**
 * Check if the device can reach Supabase by attempting a lightweight auth call.
 * Returns true if online, false if offline or unreachable.
 */
export async function checkOnlineStatus(): Promise<boolean> {
  try {
    const { error } = await supabase.auth.getSession();
    return !error;
  } catch {
    return false;
  }
}
