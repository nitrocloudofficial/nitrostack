import { Injectable, OnModuleInit, OnModuleDestroy } from '@nitrostack/core';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private db!: sqlite3.Database;
  private dbPath!: string;

  async onModuleInit() {
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
        console.error(`DbService: Failed to open database at ${this.dbPath}:`, err.message);
      } else {
        console.error(`DbService: Connected to SQLite database at ${this.dbPath}`);
      }
    });
  }

  async onModuleDestroy() {
    if (this.db) {
      await new Promise<void>((resolve) => {
        this.db.close((err) => {
          if (err) {
            console.error('DbService: Failed to close database:', err.message);
          }
          resolve();
        });
      });
    }
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

  async applyPatch(patch: Record<string, any>, scenarioId: string, description: string) {
    for (const [key, value] of Object.entries(patch)) {
      if (key.startsWith('meta.')) {
        const metaKey = key.split('.')[1];
        await this.run(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`, [metaKey, String(value)]);
        
        // If an active incident is declared, create a record in safety_incidents
        if (metaKey === 'active_incident' && value) {
          const incidentId = String(value);
          const location = scenarioId === 'safety_breach' ? 'Line1 conveyor coupling' : 'Machine area';
          const severity = scenarioId === 'safety_breach' ? 'CRITICAL' : 'HIGH';
          await this.run(
            `INSERT OR REPLACE INTO safety_incidents 
            (incident_id, location, severity, description, status, reported_at, osha_compliance_flagged, timeline) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [incidentId, location, severity, description, 'REPORTED', new Date().toISOString(), 1, '', '[]']
          );
        }
      } 
      else if (key.startsWith('machines.')) {
        const parts = key.split('.');
        const machineId = parts[1];
        let field = parts.slice(2).join('_');
        
        // Map sensors sub-fields to database columns
        if (field === 'sensors_type') field = 'sensor_type';
        if (field === 'sensors_air_temperature_k') field = 'air_temp_k';
        if (field === 'sensors_process_temperature_k') field = 'process_temp_k';
        if (field === 'sensors_rotational_speed_rpm') field = 'rotational_speed_rpm';
        if (field === 'sensors_torque_nm') field = 'torque_nm';
        if (field === 'sensors_tool_wear_min') field = 'tool_wear_min';
        
        await this.run(`UPDATE machines SET ${field} = ? WHERE id = ?`, [value, machineId]);
      } 
      else if (key.startsWith('production.')) {
        const parts = key.split('.');
        const lineId = parts[1];
        const field = parts[2];
        await this.run(`UPDATE production_lines SET ${field} = ? WHERE id = ?`, [value, lineId]);
      } 
      else if (key.startsWith('inventory.')) {
        const parts = key.split('.');
        const partNumber = parts[1];
        const field = parts[2];
        await this.run(`UPDATE inventory SET ${field} = ? WHERE part_number = ?`, [value, partNumber]);
      } 
      else if (key.startsWith('suppliers.')) {
        const parts = key.split('.');
        const supplierId = parts[1];
        const field = parts[2];
        await this.run(`UPDATE suppliers SET ${field} = ? WHERE id = ?`, [value, supplierId]);
      }
      else if (key.startsWith('safety.')) {
        const field = key.split('.')[1];
        await this.run(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`, [key, String(value)]);
      }
    }
  }
}
