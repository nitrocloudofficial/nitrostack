import { TelemetryFrame, EvaluationResult } from '../config/thresholds.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function getWritableDataDir(): string {
  if (process.env.DATA_DIR) {
    return process.env.DATA_DIR;
  }
  const localDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const testFile = path.join(localDir, `.perm_test_${Date.now()}`);
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return localDir;
  } catch {
    const tmpDir = path.join(os.tmpdir(), 'satellite_mcp_data');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {
      // Ignore if tmpdir cannot be created
    }
    return tmpDir;
  }
}

const DATA_DIR = getWritableDataDir();
const DATA_FILE = path.join(DATA_DIR, 'telemetry_history.json');

export interface TelemetryFeatures {
  gyro_residual_rate_of_change: number;
  gyro_residual_persistence_count: number;
  gyro_residual_mean: number;
  gyro_residual_variance: number;
  bus_voltage_rate_of_change: number;
  battery_temp_rate_of_change: number;
}

class TelemetryStore {
  private history: EvaluationResult[] = [];
  private currentTelemetry: TelemetryFrame = {
    bus_voltage: 28.0,
    battery_temp: 22.5,
    tumbling_rate: 0.02,
    gyro_star_residual: 0.05,
    seu_counter: 0,
    is_saa_crossing: false,
    timestamp: new Date().toISOString(),
    satellite_id: 'SAT-ALPHA-1'
  };

  public getRollingFeatures(current: TelemetryFrame): TelemetryFeatures {
    const currentSatId = current.satellite_id || 'SAT-ALPHA-1';
    const satHistory = this.history
      .filter(h => (h.telemetry.satellite_id || 'SAT-ALPHA-1') === currentSatId)
      .map(h => h.telemetry);
    const frames = [current, ...satHistory];
    
    // Compute rate of change (per second)
    let gyro_residual_rate_of_change = 0;
    let bus_voltage_rate_of_change = 0;
    let battery_temp_rate_of_change = 0;
    
    if (frames.length > 1) {
      const curr = frames[0];
      const prev = frames[1];
      const currTime = curr.timestamp ? new Date(curr.timestamp).getTime() : Date.now();
      const prevTime = prev.timestamp ? new Date(prev.timestamp).getTime() : currTime - 1000;
      const dt = (currTime - prevTime) / 1000;
      const dtSafe = dt > 0 ? dt : 1.0;
      
      const currGyro = Number.isNaN(curr.gyro_star_residual) ? 0 : curr.gyro_star_residual;
      const prevGyro = Number.isNaN(prev.gyro_star_residual) ? 0 : prev.gyro_star_residual;
      const currVolt = Number.isNaN(curr.bus_voltage) ? 28 : curr.bus_voltage;
      const prevVolt = Number.isNaN(prev.bus_voltage) ? 28 : prev.bus_voltage;
      const currTemp = Number.isNaN(curr.battery_temp) ? 20 : curr.battery_temp;
      const prevTemp = Number.isNaN(prev.battery_temp) ? 20 : prev.battery_temp;

      gyro_residual_rate_of_change = (currGyro - prevGyro) / dtSafe;
      bus_voltage_rate_of_change = (currVolt - prevVolt) / dtSafe;
      battery_temp_rate_of_change = (currTemp - prevTemp) / dtSafe;
    }
    
    // Persistence count: consecutive frames where gyro_star_residual > 0.5
    const gyro_threshold = 0.5;
    let gyro_residual_persistence_count = 0;
    for (const frame of frames) {
      const g = Number.isNaN(frame.gyro_star_residual) ? 0 : frame.gyro_star_residual;
      if (g > gyro_threshold) {
        gyro_residual_persistence_count++;
      } else {
        break;
      }
    }
    
    // Mean and Variance of gyro residual
    const gyro_residuals = frames.map(f => Number.isNaN(f.gyro_star_residual) ? 0 : f.gyro_star_residual);
    const sum = gyro_residuals.reduce((a, b) => a + b, 0);
    const gyro_residual_mean = gyro_residuals.length > 0 ? sum / gyro_residuals.length : 0;
    
    const sqDiffs = gyro_residuals.map(v => Math.pow(v - gyro_residual_mean, 2));
    const gyro_residual_variance = gyro_residuals.length > 0 ? sqDiffs.reduce((a, b) => a + b, 0) / gyro_residuals.length : 0;
    
    return {
      gyro_residual_rate_of_change,
      gyro_residual_persistence_count,
      gyro_residual_mean,
      gyro_residual_variance,
      bus_voltage_rate_of_change,
      battery_temp_rate_of_change
    };
  }

  constructor() {
    this.loadHistory();
  }

  private loadHistory(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.history = JSON.parse(raw);
        if (this.history.length > 0) {
          this.currentTelemetry = { ...this.history[0].telemetry };
        }
        console.error(`[TelemetryStore] Loaded ${this.history.length} evaluation records from persistent storage.`);
      }
    } catch (err) {
      console.warn('[TelemetryStore] Operating in memory-only mode. Could not load telemetry history from disk:', (err as Error).message);
    }
  }

  private saveHistory(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.history, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[TelemetryStore] Operating in memory-only mode. Could not persist telemetry history to disk:', (err as Error).message);
    }
  }

  public getCurrentTelemetry(): TelemetryFrame {
    return { ...this.currentTelemetry };
  }

  public recordEvaluation(result: EvaluationResult): void {
    this.history.unshift(result);
    if (this.history.length > 100) {
      this.history.pop();
    }
    this.currentTelemetry = { ...result.telemetry };
    this.saveHistory();
  }

  public getHistory(limit: number = 10): EvaluationResult[] {
    return this.history.slice(0, limit);
  }

  public getAnomalyEvents(): EvaluationResult[] {
    return this.history.filter(item => item.class !== 'NOMINAL');
  }

  public clearHistory(): void {
    this.history = [];
    this.currentTelemetry = {
      bus_voltage: 28.0,
      battery_temp: 22.5,
      tumbling_rate: 0.02,
      gyro_star_residual: 0.05,
      seu_counter: 0,
      is_saa_crossing: false,
      timestamp: new Date().toISOString(),
      satellite_id: 'SAT-ALPHA-1'
    };
    try {
      if (fs.existsSync(DATA_FILE)) {
        fs.unlinkSync(DATA_FILE);
      }
    } catch (err) {
      console.warn('[TelemetryStore] Could not delete telemetry history file:', (err as Error).message);
    }
  }
}

export const telemetryStore = new TelemetryStore();
