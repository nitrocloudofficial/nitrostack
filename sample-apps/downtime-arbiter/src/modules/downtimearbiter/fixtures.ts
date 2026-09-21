/**
 * Mock data: machines, rolling plan, negotiation logs.
 */

import {
  MachineSignal,
  ScheduledJob,
  RollingPlan,
  MachineNegotiationLog,
} from './types.js';

/**
 * 4 machines with different failure modes and risk levels.
 */
export const MACHINES: Record<string, MachineSignal> = {
  MACH_001: {
    machine_id: 'MACH_001',
    failure_mode: 'bearing_spall',
    current_risk_pct: 15,
    sensor_detail: {
      bearing_temp_c: 72,
      vibration_hz: 4.2,
      oil_pressure_bar: 2.8,
      last_reading_timestamp: '2025-01-15T10:30:00Z',
    },
  },
  MACH_002: {
    machine_id: 'MACH_002',
    failure_mode: 'thermal_degradation',
    current_risk_pct: 45,
    sensor_detail: {
      bearing_temp_c: 88,
      vibration_hz: 3.1,
      oil_pressure_bar: 2.5,
      last_reading_timestamp: '2025-01-15T10:30:00Z',
    },
  },
  MACH_003: {
    machine_id: 'MACH_003',
    failure_mode: 'bearing_spall',
    current_risk_pct: 62,
    sensor_detail: {
      bearing_temp_c: 95,
      vibration_hz: 6.8,
      oil_pressure_bar: 2.2,
      last_reading_timestamp: '2025-01-15T10:30:00Z',
    },
  },
  MACH_004: {
    machine_id: 'MACH_004',
    failure_mode: 'thermal_degradation',
    current_risk_pct: 28,
    sensor_detail: {
      bearing_temp_c: 81,
      vibration_hz: 2.9,
      oil_pressure_bar: 2.9,
      last_reading_timestamp: '2025-01-15T10:30:00Z',
    },
  },
};

/**
 * 2-week rolling plan: 4 machines, 2 technicians (each covers 2 machines).
 */
export const ROLLING_PLAN: RollingPlan = {
  plan_week_start: '2025-01-15T00:00:00Z',
  plan_week_end: '2025-01-29T23:59:59Z',
  technicians: [
    {
      technician_id: 'TECH_001',
      name: 'Alice Chen',
      machines_assigned: ['MACH_001', 'MACH_002'],
    },
    {
      technician_id: 'TECH_002',
      name: 'Bob Martinez',
      machines_assigned: ['MACH_003', 'MACH_004'],
    },
  ],
  jobs: [
    {
      job_id: 'JOB_001',
      machine_id: 'MACH_001',
      technician_id: 'TECH_001',
      scheduled_start: '2025-01-16T08:00:00Z',
      scheduled_end: '2025-01-16T12:00:00Z',
      deadline: '2025-01-20T17:00:00Z',
      description: 'Routine bearing inspection',
    },
    {
      job_id: 'JOB_002',
      machine_id: 'MACH_002',
      technician_id: 'TECH_001',
      scheduled_start: '2025-01-17T14:00:00Z',
      scheduled_end: '2025-01-17T18:00:00Z',
      deadline: '2025-01-21T17:00:00Z',
      description: 'Thermal sensor calibration',
    },
    {
      job_id: 'JOB_003',
      machine_id: 'MACH_003',
      technician_id: 'TECH_002',
      scheduled_start: '2025-01-18T09:00:00Z',
      scheduled_end: '2025-01-18T13:00:00Z',
      deadline: '2025-01-22T17:00:00Z',
      description: 'Bearing replacement (high risk)',
    },
    {
      job_id: 'JOB_004',
      machine_id: 'MACH_004',
      technician_id: 'TECH_002',
      scheduled_start: '2025-01-19T10:00:00Z',
      scheduled_end: '2025-01-19T14:00:00Z',
      deadline: '2025-01-23T17:00:00Z',
      description: 'Thermal management upgrade',
    },
  ],
};

/**
 * In-memory negotiation logs (per machine).
 * Initialized empty; populated as tools are called.
 */
export const NEGOTIATION_LOGS: Record<string, MachineNegotiationLog> = {
  MACH_001: {
    machine_id: 'MACH_001',
    entries: [],
  },
  MACH_002: {
    machine_id: 'MACH_002',
    entries: [],
  },
  MACH_003: {
    machine_id: 'MACH_003',
    entries: [],
  },
  MACH_004: {
    machine_id: 'MACH_004',
    entries: [],
  },
};
