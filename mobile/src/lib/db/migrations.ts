import type { SQLiteDatabase } from 'expo-sqlite';
import { ALL_MIGRATIONS } from './schema';

export function runMigrations(db: SQLiteDatabase): void {
  for (const migration of ALL_MIGRATIONS) {
    db.execSync(migration);
  }
}
