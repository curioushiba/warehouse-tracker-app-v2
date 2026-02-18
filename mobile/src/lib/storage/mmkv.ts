import { MMKV } from 'react-native-mmkv'

export const storage = new MMKV({ id: 'packtrack-storage' })

// --- Generic operations ---

export function setString(key: string, value: string): void {
  storage.set(key, value)
}

export function getString(key: string): string | undefined {
  return storage.getString(key)
}

export function setObject<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value))
}

export function getObject<T>(key: string): T | undefined {
  const raw = storage.getString(key)
  if (raw === undefined) return undefined
  try {
    return JSON.parse(raw) as T
  } catch {
    return undefined
  }
}

export function setBoolean(key: string, value: boolean): void {
  storage.set(key, value)
}

export function getBoolean(key: string): boolean {
  return storage.getBoolean(key)
}

export function remove(key: string): void {
  storage.delete(key)
}

export function clearAll(): void {
  storage.clearAll()
}

// --- Typed helpers ---

const KEYS = {
  SESSION_TOKEN: 'session-token',
  SELECTED_DOMAIN: 'selected-domain',
  DARK_MODE: 'dark-mode',
  SETTINGS: 'app-settings',
} as const

export function getSessionToken(): string | undefined {
  return getString(KEYS.SESSION_TOKEN)
}

export function setSessionToken(token: string): void {
  setString(KEYS.SESSION_TOKEN, token)
}

export function clearSession(): void {
  remove(KEYS.SESSION_TOKEN)
}

export function getSelectedDomain(): string | undefined {
  return getString(KEYS.SELECTED_DOMAIN)
}

export function setSelectedDomain(domain: string): void {
  setString(KEYS.SELECTED_DOMAIN, domain)
}

export function getDarkMode(): 'light' | 'dark' | 'system' {
  return (getString(KEYS.DARK_MODE) as 'light' | 'dark' | 'system') ?? 'system'
}

export function setDarkMode(mode: 'light' | 'dark' | 'system'): void {
  setString(KEYS.DARK_MODE, mode)
}

export function getSettings<T>(): T | undefined {
  return getObject<T>(KEYS.SETTINGS)
}

export function setSettings<T>(settings: T): void {
  setObject(KEYS.SETTINGS, settings)
}
