export interface TelemetryFrame {
  bus_voltage: number;
  battery_temp: number;
  tumbling_rate: number;
  gyro_star_residual: number;
  seu_counter: number;
  is_saa_crossing: boolean;
  timestamp?: string;
  satellite_id?: string;

  // Optional extensions for telemetry engine compatibility
  gyro?: number;
  star_tracker?: number;
  battery_voltage?: number;
  temperature?: number;
  wheel_current?: number;
  radiation_flux?: number;
  saa_flag?: number | boolean;
  ecc_errors?: number;
  watchdog_resets?: number;
}

export interface DetailedTelemetry {
  gyro: number;
  star_tracker: number;
  battery_voltage: number;
  temperature: number;
  wheel_current: number;
  radiation_flux: number;
  saa_flag: number;
  ecc_errors: number;
  watchdog_resets: number;
  satellite_id: string;
  timestamp: string;

  bus_voltage?: number;
  battery_temp?: number;
  tumbling_rate?: number;
  gyro_star_residual?: number;
  seu_counter?: number;
  is_saa_crossing?: boolean;
}

export type DecisionType = 'NOMINAL' | 'CONTINUE_MISSION' | 'ISOLATE_SENSOR' | 'SAFE_MODE' | 'LOG_AND_CONTINUE' | 'SWITCH_TO_REDUNDANT_SENSOR' | 'REBOOT_COMPUTER';

export type AnomalyClassType = 'Nominal' | 'Space-Weather Glitch' | 'Sensor Fault' | 'True Anomaly' | 'NOMINAL' | 'SENSOR_FAULT' | 'SPACE_WEATHER' | 'BATTERY_FAILURE' | 'THERMAL_FAILURE' | 'SATELLITE_TUMBLING' | 'REACTION_WHEEL_FAILURE' | 'MEMORY_CORRUPTION';

export interface EvaluationResult {
  decision: DecisionType;
  reason: string;
  class: AnomalyClassType;
  confidence: number;
  action: string;
  timestamp: string;
  telemetry: TelemetryFrame;
  severity?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  health_score?: number;
  features?: Record<string, number>;
}

export interface SafetyThresholds {
  min_bus_voltage: number;
  max_battery_temp: number;
  max_tumbling_rate: number;
  max_gyro_residual: number;
  min_seu_saa_glitch: number;
  min_battery_voltage: number;
  max_temperature: number;
  max_tumbling_limit: number;
  max_wheel_current: number;
  max_ecc_errors: number;
  min_radiation_flux_space_weather: number;
}

export const DEFAULT_THRESHOLDS: SafetyThresholds = {
  min_bus_voltage: 22.0,
  max_battery_temp: 55.0,
  max_tumbling_rate: 10.0,
  max_gyro_residual: 0.8,
  min_seu_saa_glitch: 5,
  min_battery_voltage: 18.0,
  max_temperature: 80.0,
  max_tumbling_limit: 5.0,
  max_wheel_current: 5.0,
  max_ecc_errors: 20,
  min_radiation_flux_space_weather: 50
};
