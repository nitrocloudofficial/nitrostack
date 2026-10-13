import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Cloud platforms have read-only app directories. Write to tmpdir instead.
const DB_FILE = process.env.DB_PATH || path.resolve(os.tmpdir(), 'database.json');

export interface Todo {
  id: string;
  title: string;
  due?: string;
  completed: boolean;
}

export interface FlightSearch {
  id: string;
  query: string;
  results: string;
  timestamp: number;
}

export interface UserToken {
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  expiryDate: number | null;
}

export interface DatabaseSchema {
  todos: Todo[];
  flightSearches: FlightSearch[];
  userTokens: UserToken[];
}

const defaultData: DatabaseSchema = {
  todos: [],
  flightSearches: [],
  userTokens: []
};

export class JsonDB {
  private memoryData: DatabaseSchema | null = null;
  private useMemoryFallback = false;

  private async read(): Promise<DatabaseSchema> {
    if (this.useMemoryFallback && this.memoryData) {
      return this.memoryData;
    }

    try {
      const data = await fs.readFile(DB_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        try {
          await this.write(defaultData);
          return defaultData;
        } catch (writeError) {
          // Fallback to memory if writing fails
          this.useMemoryFallback = true;
          this.memoryData = JSON.parse(JSON.stringify(defaultData));
          return this.memoryData!;
        }
      }
      
      // If fs module fails completely (e.g. edge runtimes)
      console.warn('Filesystem read failed, falling back to in-memory database:', error.message);
      this.useMemoryFallback = true;
      this.memoryData = JSON.parse(JSON.stringify(defaultData));
      return this.memoryData!;
    }
  }

  private async write(data: DatabaseSchema): Promise<void> {
    if (this.useMemoryFallback) {
      this.memoryData = data;
      return;
    }

    try {
      await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error: any) {
      console.warn('Filesystem write failed, switching to in-memory fallback:', error.message);
      this.useMemoryFallback = true;
      this.memoryData = data;
    }
  }

  // Todos
  async getTodos(): Promise<Todo[]> {
    const db = await this.read();
    return db.todos;
  }
  
  async saveTodo(todo: Todo): Promise<void> {
    const db = await this.read();
    const index = db.todos.findIndex(t => t.id === todo.id);
    if (index >= 0) db.todos[index] = todo;
    else db.todos.push(todo);
    await this.write(db);
  }

  async deleteTodo(id: string): Promise<void> {
    const db = await this.read();
    db.todos = db.todos.filter(t => t.id !== id);
    await this.write(db);
  }

  // Flight Searches
  async getFlightSearches(): Promise<FlightSearch[]> {
    const db = await this.read();
    return db.flightSearches;
  }

  async saveFlightSearch(search: FlightSearch): Promise<void> {
    const db = await this.read();
    db.flightSearches.push(search);
    await this.write(db);
  }

  // User Tokens
  async getUserToken(userId: string): Promise<UserToken | undefined> {
    const db = await this.read();
    return db.userTokens.find(t => t.userId === userId);
  }

  async saveUserToken(token: UserToken): Promise<void> {
    const db = await this.read();
    const index = db.userTokens.findIndex(t => t.userId === token.userId);
    if (index >= 0) db.userTokens[index] = token;
    else db.userTokens.push(token);
    await this.write(db);
  }
}

export const db = new JsonDB();
