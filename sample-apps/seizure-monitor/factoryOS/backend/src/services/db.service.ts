import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

export class DbService {
  private db!: sqlite3.Database;
  private dbPath!: string;

  constructor() {
    let currentDir = process.cwd();
    // Resolve path to factory.db
    while (currentDir) {
      const dbFile = path.join(currentDir, 'factory.db');
      if (fs.existsSync(dbFile)) {
        this.dbPath = dbFile;
        break;
      }
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }

    if (!this.dbPath) {
      this.dbPath = path.join(process.cwd(), 'factory.db');
    }

    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error(`Express DbService: Failed to open database at ${this.dbPath}:`, err.message);
      } else {
        console.log(`Express DbService: Connected to SQLite database at ${this.dbPath}`);
      }
    });
  }

  query<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  run(sql: string, params: any[] = []): Promise<{ lastID: any; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
}

export const dbService = new DbService();
