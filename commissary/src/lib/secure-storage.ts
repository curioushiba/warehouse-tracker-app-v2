import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Supabase-compatible storage adapter backed by expo-secure-store.
 * Falls back gracefully if SecureStore operations fail (e.g. on web/simulator).
 *
 * On first use, migrates any existing auth tokens from AsyncStorage → SecureStore.
 */

const MIGRATED_KEY = '__secure_storage_migrated';
let migrated = false;

async function migrateFromAsyncStorage(): Promise<void> {
  if (migrated) return;
  try {
    const already = await AsyncStorage.getItem(MIGRATED_KEY);
    if (already === '1') {
      migrated = true;
      return;
    }

    const allKeys = await AsyncStorage.getAllKeys();
    const sbKeys = allKeys.filter((k) => k.startsWith('sb-'));
    for (const key of sbKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        await SecureStore.setItemAsync(key, value);
      }
      await AsyncStorage.removeItem(key);
    }

    await AsyncStorage.setItem(MIGRATED_KEY, '1');
    migrated = true;
  } catch {
    // Migration failure is non-fatal — tokens will be refreshed on next login
    migrated = true;
  }
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    await migrateFromAsyncStorage();
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Silently fail — next auth refresh will retry
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Silently fail
    }
  },
};
