import initSqlJs, { type Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = process.env.MEMORY_DATA_DIR || process.env.DATA_DIR || path.join(__dirname, '..', '..', '..', 'data');
let DB_PATH = process.env.MEMORY_DB_PATH || process.env.DB_PATH || path.join(DB_DIR, 'memory.db');

export interface MemoryRow {
  memory_id: string;
  content: string;
  memory_type: string;
  project_id: string;
  task_id: string;
  agent_id: string;
  importance: number;
  timestamp: string;
}

let db: Database;

export async function initDb(): Promise<void> {
  let dir = path.dirname(DB_PATH);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err: any) {
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      console.warn(`Permission denied creating directory ${dir}. Falling back to system temp directory...`);
      dir = path.join(os.tmpdir(), 'shared-agent-memory');
      fs.mkdirSync(dir, { recursive: true });
      DB_PATH = path.join(dir, 'memory.db');
    } else {
      throw err;
    }
  }
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS memories (
      memory_id TEXT PRIMARY KEY,
      content TEXT,
      memory_type TEXT,
      project_id TEXT,
      task_id TEXT,
      agent_id TEXT,
      importance REAL,
      timestamp TEXT
    )
  `);
  saveDb();
}

function saveDb(): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function queryAll(sql: string, params: any[] = []): MemoryRow[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: MemoryRow[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as unknown as MemoryRow;
    results.push(row);
  }
  stmt.free();
  return results;
}

export function insertMemory(memory: MemoryRow): string {
  db.run(
    `INSERT INTO memories (memory_id, content, memory_type, project_id, task_id, agent_id, importance, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [memory.memory_id, memory.content, memory.memory_type, memory.project_id, memory.task_id, memory.agent_id, memory.importance, memory.timestamp]
  );
  saveDb();
  return memory.memory_id;
}

export function getByTask(taskId: string): MemoryRow[] {
  return queryAll('SELECT * FROM memories WHERE task_id = ?', [taskId]);
}

export function getByAgent(agentId: string, projectId: string): MemoryRow[] {
  return queryAll('SELECT * FROM memories WHERE agent_id = ? AND project_id = ?', [agentId, projectId]);
}

export function getDecisions(projectId: string, taskId?: string): MemoryRow[] {
  if (taskId) {
    return queryAll(
      "SELECT * FROM memories WHERE project_id = ? AND task_id = ? AND memory_type = 'decision'",
      [projectId, taskId]
    );
  }
  return queryAll(
    "SELECT * FROM memories WHERE project_id = ? AND memory_type = 'decision'",
    [projectId]
  );
}

export function getAll(): MemoryRow[] {
  return queryAll('SELECT * FROM memories ORDER BY timestamp DESC');
}

export function searchByContent(query: string, projectId: string, taskId?: string, limit: number = 5): MemoryRow[] {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  if (words.length === 0) {
    if (taskId) {
      return queryAll(
        'SELECT * FROM memories WHERE project_id = ? AND task_id = ? ORDER BY importance DESC LIMIT ?',
        [projectId, taskId, limit]
      );
    }
    return queryAll(
      'SELECT * FROM memories WHERE project_id = ? ORDER BY importance DESC LIMIT ?',
      [projectId, limit]
    );
  }

  const likeClauses = words.map(() => "LOWER(content) LIKE ?").join(' OR ');
  const likeParams = words.map(w => `%${w}%`);

  if (taskId) {
    return queryAll(
      `SELECT * FROM memories WHERE project_id = ? AND task_id = ? AND (${likeClauses}) ORDER BY importance DESC LIMIT ?`,
      [projectId, taskId, ...likeParams, limit]
    );
  }
  return queryAll(
    `SELECT * FROM memories WHERE project_id = ? AND (${likeClauses}) ORDER BY importance DESC LIMIT ?`,
    [projectId, ...likeParams, limit]
  );
}
