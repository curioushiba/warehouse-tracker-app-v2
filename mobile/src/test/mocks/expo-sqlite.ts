import Database from 'better-sqlite3';

export class SQLiteDatabase {
  private db: Database.Database;

  constructor() {
    this.db = new Database(':memory:');
  }

  runSync(sql: string, params?: unknown[]): void {
    const stmt = this.db.prepare(sql);
    if (params) {
      stmt.run(...params);
    } else {
      stmt.run();
    }
  }

  getAllSync<T>(sql: string, params?: unknown[]): T[] {
    const stmt = this.db.prepare(sql);
    if (params) {
      return stmt.all(...params) as T[];
    }
    return stmt.all() as T[];
  }

  getFirstSync<T>(sql: string, params?: unknown[]): T | null {
    const stmt = this.db.prepare(sql);
    if (params) {
      return (stmt.get(...params) as T) ?? null;
    }
    return (stmt.get() as T) ?? null;
  }

  // Uses better-sqlite3's Database.exec() for running raw DDL/SQL statements
  execSync(sql: string): void {
    this.db.exec(sql);
  }

  close(): void {
    this.db.close();
  }
}

export function createMockDatabase(): SQLiteDatabase {
  return new SQLiteDatabase();
}
