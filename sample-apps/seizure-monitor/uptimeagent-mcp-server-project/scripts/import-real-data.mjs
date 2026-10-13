// Builds UptimeAgent's dataset from the real NASA C-MAPSS Turbofan Engine
// Degradation dataset (FD001 train split — same content as Kaggle
// "behrad3d/nasa-cmaps"). Source file: data/raw/train_FD001.txt.
//
// FD001 columns (space-separated, no header):
//   1  unit number
//   2  time in cycles
//   3-5  operational settings 1-3
//   6-26 sensor measurements 1-21 (see SENSOR_COLUMNS below)
//
// C-MAPSS has no vibration/accelerometer sensor (it's a thermodynamic
// simulation, not an instrumented rig), so UptimeAgent tracks 3 real
// sensors, chosen empirically for the strongest, most consistent
// degradation signal in this dataset (see docs/sensor-selection.md):
//   temperature      -> sensor 4  (T50)  LPT outlet temperature, degR
//   pressure         -> sensor 11 (Ps30) HPC outlet static pressure, psia
//   rotationalSpeed  -> sensor 14 (NRc)  corrected core speed, rpm
//
// Every engine in FD001's train split runs to its actual real failure —
// there's no "healthy" vs "degrading" label. To get demo variety without
// inventing any values, DEGRADING_UNITS are exposed through their full
// real run (ending at/near real failure); HEALTHY_UNITS are exposed only
// through the first 35% of their real run — a real early-life slice,
// picked because it empirically keeps every anomaly z-score below the
// "moderate" threshold across all three sensors (verified per-unit).
//
// Usage: node scripts/import-real-data.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

const SENSOR_COLUMNS = {
  temperature: 3, // 0-based index within the 21 sensor columns -> sensor 4, T50
  pressure: 10, // -> sensor 11, Ps30
  rotationalSpeed: 13 // -> sensor 14, NRc
};
const FIRST_SENSOR_COLUMN = 5; // 0-based: columns 0-4 are unit, cycle, and 3 operational settings

const ENGINE_TYPES = [
  'Turbofan Engine - CF-Series Analog',
  'Turbofan Engine - GE9X-Class Analog',
  'Turbofan Engine - Trent-Class Analog'
];

const TODAY = new Date('2026-07-26T00:00:00Z');

// Seeded PRNG (mulberry32) - only used for cosmetic fleet metadata
// (install dates), never for sensor values, which are 100% real.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);
const randRange = (min, max) => min + rng() * (max - min);

const DEGRADING_UNITS = new Set([3, 7, 11, 14]);
const HEALTHY_TRUNCATE_FRACTION = 0.35;
const NUM_ENGINES = 15;

// --- Parse the real FD001 file ---
const rawPath = path.join(dataDir, 'raw', 'train_FD001.txt');
const lines = readFileSync(rawPath, 'utf-8').trim().split('\n');
const byUnit = new Map();
for (const line of lines) {
  const cols = line.trim().split(/\s+/).map(Number);
  const unit = cols[0];
  if (!byUnit.has(unit)) byUnit.set(unit, []);
  byUnit.get(unit).push(cols);
}

function toReading(cols, cycle, timestamp) {
  const reading = { cycle, timestamp };
  for (const [name, sensorIdx] of Object.entries(SENSOR_COLUMNS)) {
    reading[name] = Math.round(cols[FIRST_SENSOR_COLUMN + sensorIdx] * 100) / 100;
  }
  return reading;
}

const fleet = [];
const sensorHistory = {};

for (let i = 1; i <= NUM_ENGINES; i++) {
  const id = `engine-${String(i).padStart(2, '0')}`;
  const realUnit = i; // real FD001 unit number, used directly for traceability
  const fullRun = byUnit.get(realUnit);
  if (!fullRun) throw new Error(`No data for real unit ${realUnit}`);

  const degrading = DEGRADING_UNITS.has(realUnit);
  const cycleRows = degrading ? fullRun : fullRun.slice(0, Math.floor(fullRun.length * HEALTHY_TRUNCATE_FRACTION));

  const history = cycleRows.map((cols, idx) => {
    const cycle = idx + 1;
    const timestamp = new Date(TODAY.getTime() - (cycleRows.length - cycle) * 86400000).toISOString();
    return toReading(cols, cycle, timestamp);
  });
  sensorHistory[id] = history;

  const installDaysAgo = Math.floor(randRange(180, 1800));
  fleet.push({
    id,
    name: `Engine ${i}`,
    type: ENGINE_TYPES[i % ENGINE_TYPES.length],
    installDate: new Date(TODAY.getTime() - installDaysAgo * 86400000).toISOString().slice(0, 10),
    status: degrading ? 'critical' : 'operational',
    totalCyclesLogged: history.length,
    sourceDataset: 'NASA C-MAPSS FD001',
    realUnitNumber: realUnit
  });
}

writeFileSync(path.join(dataDir, 'machine-fleet.json'), JSON.stringify(fleet, null, 2));
writeFileSync(path.join(dataDir, 'sensor-history.json'), JSON.stringify(sensorHistory, null, 2));

console.log(`Imported ${fleet.length} engines from real NASA C-MAPSS FD001 data (units 1-${NUM_ENGINES}).`);
console.log(`Degrading (full real run to failure): ${[...DEGRADING_UNITS].map(u => `engine-${String(u).padStart(2, '0')}`).join(', ')}`);
console.log(`Healthy (real data, truncated to first ${HEALTHY_TRUNCATE_FRACTION * 100}% of run): ${fleet.filter(m => m.status !== 'critical').map(m => m.id).join(', ')}`);
console.log(`Written to ${dataDir}`);
