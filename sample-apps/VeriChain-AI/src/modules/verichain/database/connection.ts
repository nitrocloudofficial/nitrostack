import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

import os from 'os';

// Load environment variables from the parent project directory
dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'sqlite:///./database/verichain.db';
let dbPath = '';

const cwd = process.cwd();
const isBackendExpress = cwd.endsWith('backend-express');

if (dbUrl === ':memory:' || dbUrl === 'sqlite://:memory:') {
    dbPath = ':memory:';
} else if (dbUrl.startsWith('sqlite:///')) {
    const relativePath = dbUrl.replace('sqlite:///', '');
    dbPath = isBackendExpress 
        ? path.resolve(cwd, '..', relativePath) 
        : path.resolve(cwd, relativePath);
} else {
    dbPath = isBackendExpress
        ? path.resolve(cwd, '../database/verichain.db')
        : path.resolve(cwd, 'database/verichain.db');
}

// Ensure the directory exists with fallback for read-only cloud environments
if (dbPath !== ':memory:') {
    let dbDir = path.dirname(dbPath);
    try {
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
    } catch (err: any) {
        console.warn(`⚠️ Could not create database directory at ${dbDir} (${err.message}). Falling back to temp directory.`);
        dbPath = path.join(os.tmpdir(), 'verichain.db');
        dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
    }
}

console.log(`Connecting to SQLite database at: ${dbPath}`);

const dbConnection = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('❌ Failed to open SQLite database:', err.message);
    } else {
        console.log('✓ SQLite database connected successfully.');
    }
});

export interface RunResult {
    lastID: number;
    changes: number;
}

// Wrap methods in Promises
export const db = {
    get: <T>(query: string, params: any[] = []): Promise<T | undefined> => {
        return new Promise((resolve, reject) => {
            dbConnection.get(query, params, (err, row) => {
                if (err) reject(err);
                else resolve(row as T);
            });
        });
    },
    all: <T>(query: string, params: any[] = []): Promise<T[]> => {
        return new Promise((resolve, reject) => {
            dbConnection.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows as T[]);
            });
        });
    },
    run: (query: string, params: any[] = []): Promise<RunResult> => {
        return new Promise((resolve, reject) => {
            dbConnection.run(query, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    },
    exec: (query: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            dbConnection.exec(query, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    },
    close: (): Promise<void> => {
        return new Promise((resolve, reject) => {
            dbConnection.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
};

export default db;
