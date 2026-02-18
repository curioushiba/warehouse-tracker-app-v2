import AsyncStorage from '@react-native-async-storage/async-storage'

// --- Generic operations ---

export async function setString(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value)
}

export async function getString(key: string): Promise<string | undefined> {
  const value = await AsyncStorage.getItem(key)
  return value ?? undefined
}

export async function setObject<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value))
}

export async function getObject<T>(key: string): Promise<T | undefined> {
  const raw = await AsyncStorage.getItem(key)
  if (raw === null) return undefined
  try {
    return JSON.parse(raw) as T
  } catch {
    return undefined
  }
}

export async function setBoolean(key: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(key, value ? 'true' : 'false')
}

export async function getBoolean(key: string): Promise<boolean> {
  const value = await AsyncStorage.getItem(key)
  return value === 'true'
}

export async function remove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key)
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.clear()
}

// --- Typed helpers ---

export type ThemeMode = 'light' | 'dark' | 'system'

const KEYS = {
  SESSION_TOKEN: 'session-token',
  SELECTED_DOMAIN: 'selected-domain',
  DARK_MODE: 'dark-mode',
  SETTINGS: 'app-settings',
} as const

export async function getSessionToken(): Promise<string | undefined> {
  return getString(KEYS.SESSION_TOKEN)
}

export async function setSessionToken(token: string): Promise<void> {
  await setString(KEYS.SESSION_TOKEN, token)
}

export async function clearSession(): Promise<void> {
  await remove(KEYS.SESSION_TOKEN)
}

export async function getSelectedDomain(): Promise<string | undefined> {
  return getString(KEYS.SELECTED_DOMAIN)
}

export async function setSelectedDomain(domain: string): Promise<void> {
  await setString(KEYS.SELECTED_DOMAIN, domain)
}

export async function clearSelectedDomain(): Promise<void> {
  await remove(KEYS.SELECTED_DOMAIN)
}

export async function getDarkMode(): Promise<ThemeMode> {
  return (await getString(KEYS.DARK_MODE) as ThemeMode) ?? 'system'
}

export async function setDarkMode(mode: ThemeMode): Promise<void> {
  await setString(KEYS.DARK_MODE, mode)
}

export async function getSettings<T>(): Promise<T | undefined> {
  return getObject<T>(KEYS.SETTINGS)
}

export async function setSettings<T>(settings: T): Promise<void> {
  await setObject(KEYS.SETTINGS, settings)
}
