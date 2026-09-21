import { TelemetryFrame, DetailedTelemetry, EvaluationResult, DEFAULT_THRESHOLDS } from '../../config/thresholds.js';

export class SlidingWindowBuffer {
  private windowSize: number;
  private gyroBuffer: number[] = [];
  private starTrackerBuffer: number[] = [];
  private batteryVoltageBuffer: number[] = [];
  private wheelCurrentBuffer: number[] = [];

  constructor(windowSize: number = 5) {
    this.windowSize = windowSize;
  }

  public push(t: DetailedTelemetry) {
    this.gyroBuffer.push(t.gyro);
    this.starTrackerBuffer.push(t.star_tracker);
    this.batteryVoltageBuffer.push(t.battery_voltage);
    this.wheelCurrentBuffer.push(t.wheel_current);

    if (this.gyroBuffer.length > this.windowSize) {
      this.gyroBuffer.shift();
      this.starTrackerBuffer.shift();
      this.batteryVoltageBuffer.shift();
      this.wheelCurrentBuffer.shift();
    }
  }

  public clear() {
    this.gyroBuffer = [];
    this.starTrackerBuffer = [];
    this.batteryVoltageBuffer = [];
    this.wheelCurrentBuffer = [];
  }

  public isFull(): boolean {
    return this.gyroBuffer.length >= this.windowSize;
  }

  public getStats() {
    const gyroMean = mean(this.gyroBuffer);
    const gyroStd = std(this.gyroBuffer);
    const voltageMean = mean(this.batteryVoltageBuffer);
    const voltageStd = std(this.batteryVoltageBuffer);

    return { gyroMean, gyroStd, voltageMean, voltageStd };
  }
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length <= 1) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

export class MockClassifier {
  public predict(features: number[]): number {
    const gyroResidual = features[4];
    const radiationFlux = features[6];

    if (radiationFlux > DEFAULT_THRESHOLDS.min_radiation_flux_space_weather) {
      return 3; // Space Weather
    }
    if (gyroResidual > DEFAULT_THRESHOLDS.max_gyro_residual) {
      return 1; // Sensor Fault
    }
    return 0; // Nominal
  }

  public predictProba(features: number[]): number[] {
    const gyroResidual = features[4];
    const radiationFlux = features[6];

    if (radiationFlux > DEFAULT_THRESHOLDS.min_radiation_flux_space_weather) {
      return [0.05, 0.05, 0.10, 0.80];
    }
    if (gyroResidual > DEFAULT_THRESHOLDS.max_gyro_residual) {
      return [0.10, 0.80, 0.05, 0.05];
    }
    return [0.90, 0.03, 0.03, 0.04];
  }
}

export function calculateHealthScore(t: DetailedTelemetry): number {
  let score = 100;
  if (t.battery_voltage < 22) score -= 25;
  if (t.temperature > 70) score -= 20;
  if (t.ecc_errors > 10) score -= 15;
  if (t.wheel_current > 5) score -= 20;
  return Math.max(score, 0);
}

export function normalizeTelemetry(input: TelemetryFrame): DetailedTelemetry {
  return {
    gyro: input.gyro !== undefined ? input.gyro : (input.tumbling_rate !== undefined ? input.tumbling_rate : 0.2),
    star_tracker: input.star_tracker !== undefined ? input.star_tracker : 0.2,
    battery_voltage: input.battery_voltage !== undefined ? input.battery_voltage : (input.bus_voltage !== undefined ? input.bus_voltage : 28.0),
    temperature: input.temperature !== undefined ? input.temperature : (input.battery_temp !== undefined ? input.battery_temp : 30.0),
    wheel_current: input.wheel_current !== undefined ? input.wheel_current : 1.2,
    radiation_flux: input.radiation_flux !== undefined ? input.radiation_flux : (input.seu_counter !== undefined ? input.seu_counter * 5 : 5),
    saa_flag: input.saa_flag !== undefined ? Number(input.saa_flag) : (input.is_saa_crossing ? 1 : 0),
    ecc_errors: input.ecc_errors !== undefined ? input.ecc_errors : 0,
    watchdog_resets: input.watchdog_resets !== undefined ? input.watchdog_resets : 0,
    satellite_id: input.satellite_id || 'SAT-ALPHA-1',
    timestamp: input.timestamp || new Date().toISOString()
  };
}

export function hardSafetyCheck(t: DetailedTelemetry): { class: any; severity: any; action: any; reason: string } | null {
  if (t.battery_voltage < DEFAULT_THRESHOLDS.min_battery_voltage) {
    return {
      class: 'BATTERY_FAILURE',
      severity: 'CRITICAL',
      action: 'SAFE_MODE',
      reason: `Bus voltage dropped below minimum threshold (${t.battery_voltage}V < ${DEFAULT_THRESHOLDS.min_battery_voltage}V)`
    };
  }

  if (t.temperature > DEFAULT_THRESHOLDS.max_temperature) {
    return {
      class: 'THERMAL_FAILURE',
      severity: 'CRITICAL',
      action: 'SAFE_MODE',
      reason: `Battery thermal runaway detected (${t.temperature}°C > ${DEFAULT_THRESHOLDS.max_temperature}°C)`
    };
  }

  if (Math.abs(t.gyro) > DEFAULT_THRESHOLDS.max_tumbling_limit) {
    return {
      class: 'SATELLITE_TUMBLING',
      severity: 'CRITICAL',
      action: 'SAFE_MODE',
      reason: `Spacecraft tumbling rate exceeded safety limit (${Math.abs(t.gyro)} deg/s > ${DEFAULT_THRESHOLDS.max_tumbling_limit} deg/s)`
    };
  }

  return null;
}
