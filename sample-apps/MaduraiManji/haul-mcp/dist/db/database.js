import sqlite3 from 'sqlite3';
import path from 'path';
export const db = new sqlite3.Database(path.join(process.cwd(), 'database.sqlite'), (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    }
});
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    owner TEXT,
    deadline TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
    db.run(`CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary TEXT,
    description TEXT,
    start_time TEXT,
    end_time TEXT,
    event_link TEXT,
    status TEXT DEFAULT 'upcoming',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
    db.run(`CREATE TABLE IF NOT EXISTS risk_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dependency TEXT,
    status TEXT,
    risk_level TEXT,
    analysis TEXT,
    suggestion TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
    db.run(`CREATE TABLE IF NOT EXISTS progress_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_name TEXT,
    status TEXT,
    message TEXT,
    action TEXT,
    suggestion TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
});
