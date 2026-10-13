import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../factory.db');

console.log(`Initializing SQLite database at: ${DB_PATH}`);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  // 1. Meta Table
  db.run(`CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  // 2. Machines Table
  db.run(`CREATE TABLE IF NOT EXISTS machines (
    id TEXT PRIMARY KEY,
    name TEXT,
    status TEXT,
    health TEXT,
    temperature_c REAL,
    vibration_mm_s REAL,
    operating_hours INTEGER,
    last_serviced TEXT,
    sensor_type TEXT,
    air_temp_k REAL,
    process_temp_k REAL,
    rotational_speed_rpm REAL,
    torque_nm REAL,
    tool_wear_min INTEGER
  )`);

  // 3. Inventory Table
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    part_number TEXT PRIMARY KEY,
    description TEXT,
    on_hand INTEGER,
    reserved INTEGER,
    reorder_point INTEGER,
    location TEXT
  )`);

  // 4. Suppliers Table
  db.run(`CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT,
    rating REAL,
    delivery_time_hrs INTEGER,
    price REAL,
    part_number TEXT
  )`);

  // 5. Purchase Orders Table
  db.run(`CREATE TABLE IF NOT EXISTS purchase_orders (
    po_number TEXT PRIMARY KEY,
    supplier_id TEXT,
    part_number TEXT,
    quantity INTEGER,
    agreed_price REAL,
    total_amount REAL,
    status TEXT,
    eta_hours INTEGER,
    created_at TEXT
  )`);

  // 6. Production Lines Table
  db.run(`CREATE TABLE IF NOT EXISTS production_lines (
    id TEXT PRIMARY KEY,
    status TEXT,
    active_job TEXT,
    output_rate TEXT,
    scheduled_completion TEXT
  )`);

  // 7. Safety Incidents Table
  db.run(`CREATE TABLE IF NOT EXISTS safety_incidents (
    incident_id TEXT PRIMARY KEY,
    location TEXT,
    severity TEXT,
    description TEXT,
    status TEXT,
    reported_at TEXT,
    osha_compliance_flagged INTEGER,
    safety_report TEXT,
    timeline TEXT
  )`);

  console.log('Tables created. Seeding initial data...');

  // --- SEED META ---
  db.run(`INSERT OR REPLACE INTO meta (key, value) VALUES ('active_incident', NULL)`);

  // --- SEED MACHINES ---
  const machines = [
    ['M12', 'CNC Milling Machine M12', 'Operational', 'green', 68.0, 0.04, 1420, '2026-06-15', 'L', 300.5, 311.2, 1270, 67.5, 208],
    ['M13', 'Laser Cutter M13', 'Operational', 'green', 65.0, 0.03, 1100, '2026-05-10', 'M', 302.8, 312.3, 1290, 70.5, 234],
    ['M18', 'Injection Molder M18', 'Operational', 'green', 66.0, 0.05, 1560, '2026-06-01', 'H', 298.5, 309.8, 1300, 65.0, 180],
    ['M21', 'Stamping Press M21', 'Operational', 'green', 70.0, 0.04, 920, '2026-07-01', 'L', 303.0, 314.5, 1200, 60.0, 150],
    ['M27', 'Conveyor Line M27', 'Operational', 'green', 67.0, 0.03, 1340, '2026-06-20', 'M', 301.2, 311.5, 1250, 68.0, 120]
  ];
  
  const stmtMachine = db.prepare(`INSERT OR REPLACE INTO machines VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  machines.forEach(m => stmtMachine.run(m));
  stmtMachine.finalize();

  // --- SEED INVENTORY ---
  const inventory = [
    ['bearing_X52', 'High-Precision Ball Bearing X52', 0, 0, 5, 'Bay 2, Shelf A-4'],
    ['coolant_fluid', 'Industrial Machine Coolant Fluid', 40, 0, 15, 'Bay 5, Shelf C-12'],
    ['bearing_X40', 'Heavy-Duty Bearing X40', 0, 0, 5, 'Bay 2, Shelf A-6'],
    ['B-104', 'Industrial Hydraulic Pump Seal', 45, 10, 20, 'Bay 4, Shelf B-12']
  ];
  const stmtInv = db.prepare(`INSERT OR REPLACE INTO inventory VALUES (?, ?, ?, ?, ?, ?)`);
  inventory.forEach(i => stmtInv.run(i));
  stmtInv.finalize();

  // --- SEED SUPPLIERS ---
  const suppliers = [
    ['SUP-A', 'Garcia-James', 4.5, 4, 126.00, 'bearing_X52'],
    ['SUP-B', 'Rodriguez, Figueroa and Sanchez', 4.8, 24, 120.00, 'bearing_X52'],
    ['SUP-C', 'Miles-Sutton', 4.2, 96, 110.00, 'bearing_X52'],
    ['SUP-D', 'Taylor-Mcgee', 4.7, 8, 135.00, 'bearing_X40'],
    ['SUP-E', 'Garcia-James', 4.5, 4, 126.00, 'bearing_X40']
  ];
  const stmtSup = db.prepare(`INSERT OR REPLACE INTO suppliers VALUES (?, ?, ?, ?, ?, ?)`);
  suppliers.forEach(s => stmtSup.run(s));
  stmtSup.finalize();

  // --- SEED PRODUCTION LINES ---
  const lines = [
    ['Line1', 'Operational', 'JOB-8821', '120 units/hr', new Date(Date.now() + 86400000).toISOString()],
    ['Line2', 'Operational', 'JOB-9104', '95 units/hr', new Date(Date.now() + 86400000).toISOString()]
  ];
  const stmtLine = db.prepare(`INSERT OR REPLACE INTO production_lines VALUES (?, ?, ?, ?, ?)`);
  lines.forEach(l => stmtLine.run(l));
  stmtLine.finalize();

  console.log('Seeding completed successfully!');
});

db.close();
