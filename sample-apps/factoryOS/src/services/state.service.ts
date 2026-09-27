import { Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

export interface Machine {
  name: string;
  line: string;
  temperature_c: number;
  vibration_mm_s: number;
  status: 'Running' | 'Available' | 'Fault' | 'Warning' | string;
  health: 'green' | 'yellow' | 'red';
  bearing_id: string;
  last_maintenance: string;
  sensors: {
    type: string;
    air_temperature_k: number;
    process_temperature_k: number;
    rotational_speed_rpm: number;
    torque_nm: number;
    tool_wear_min: number;
  };
  produces_parts: string[];
}

export interface InventoryItem {
  on_hand: number;
  reorder_point: number;
  unit_cost: number;
  location: string;
}

export interface Supplier {
  id: string;
  name: string;
  part: string;
  price: number;
  delivery_time_hrs: number;
  rating: number;
}

export interface Technician {
  id: string;
  name: string;
  employee_id: string;
  shift: 'Day' | 'Night';
  available: boolean;
  specialty: string;
}

export interface FactoryState {
  meta: { factory_name: string; last_updated: string; active_incident: string | null };
  machines: Record<string, Machine>;
  thresholds: { temperature_c: { warning: number; critical: number }; vibration_mm_s: { warning: number; critical: number } };
  inventory: Record<string, InventoryItem>;
  suppliers: Supplier[];
  production: Record<string, { status: string; current_order: string; target_units_per_hr: number; actual_units_per_hr: number }>;
  orders: Array<{ id: string; customer: string; part: string; qty: number; due_date: string; status: string }>;
  technicians: Technician[];
  safety: { open_incidents: number; last_incident_date: string | null; compliance_status: string };
  finance: { downtime_cost_per_hour: number; expedite_fee_multiplier: number };
}

export interface ScenarioFlowStep {
  agent: string;
  action: string;
  output: string;
}

export interface Scenario {
  id: string;
  label: string;
  trigger_button: string;
  description: string;
  patch: Record<string, any>;
  expected_agent_flow: ScenarioFlowStep[];
  recovery_summary: Record<string, any>;
}

const DEFAULT_FACTORY_STATE: FactoryState = {
  meta: { factory_name: 'FactoryOS Smart Plant', last_updated: new Date().toISOString(), active_incident: null },
  machines: {
    M12: {
      name: 'CNC Milling Center M12',
      line: 'Line1',
      temperature_c: 82.5,
      vibration_mm_s: 4.2,
      status: 'Running',
      health: 'yellow',
      bearing_id: 'bearing_X52',
      last_maintenance: '2026-06-15',
      sensors: {
        type: 'M',
        air_temperature_k: 298.1,
        process_temperature_k: 308.6,
        rotational_speed_rpm: 1500,
        torque_nm: 40.0,
        tool_wear_min: 120,
      },
      produces_parts: ['gear_box_v2', 'bearing_X52'],
    },
    M21: {
      name: 'Lathe Assembly M21',
      line: 'Line2',
      temperature_c: 45.0,
      vibration_mm_s: 1.5,
      status: 'Available',
      health: 'green',
      bearing_id: 'bearing_Y30',
      last_maintenance: '2026-07-01',
      sensors: {
        type: 'L',
        air_temperature_k: 295.0,
        process_temperature_k: 300.0,
        rotational_speed_rpm: 1200,
        torque_nm: 30.0,
        tool_wear_min: 45,
      },
      produces_parts: ['gear_box_v2', 'shaft_pin'],
    },
    M13: {
      name: 'Stamping Press M13',
      line: 'Line1',
      temperature_c: 40.0,
      vibration_mm_s: 1.2,
      status: 'Available',
      health: 'green',
      bearing_id: 'bearing_X52',
      last_maintenance: '2026-06-20',
      sensors: {
        type: 'S',
        air_temperature_k: 294.0,
        process_temperature_k: 298.0,
        rotational_speed_rpm: 1000,
        torque_nm: 25.0,
        tool_wear_min: 30,
      },
      produces_parts: ['bearing_X52'],
    },
  },
  thresholds: {
    temperature_c: { warning: 75.0, critical: 90.0 },
    vibration_mm_s: { warning: 5.0, critical: 7.5 },
  },
  inventory: {
    bearing_X52: { on_hand: 0, reorder_point: 5, unit_cost: 125, location: 'Warehouse A' },
    coolant_fluid: { on_hand: 20, reorder_point: 10, unit_cost: 45, location: 'Warehouse B' },
  },
  suppliers: [
    { id: 'SUP-101', name: 'Garcia-James Industrial', part: 'bearing_X52', price: 126, delivery_time_hrs: 4, rating: 4.8 },
    { id: 'SUP-102', name: 'Rodriguez Components', part: 'bearing_X52', price: 120, delivery_time_hrs: 24, rating: 4.5 },
  ],
  production: {
    Line1: { status: 'Running', current_order: 'ORD-901', target_units_per_hr: 500, actual_units_per_hr: 480 },
    Line2: { status: 'Running', current_order: 'ORD-902', target_units_per_hr: 450, actual_units_per_hr: 440 },
  },
  orders: [
    { id: 'ORD-901', customer: 'Acme Corp', part: 'gear_box_v2', qty: 1000, due_date: '2026-08-01', status: 'IN_PROGRESS' },
  ],
  technicians: [
    { id: 'TECH-302', employee_id: 'EMP-302', name: 'Alex Rivera', specialty: 'Mechanical', available: true, shift: 'Day' },
    { id: 'TECH-303', employee_id: 'EMP-303', name: 'Sam Chen', specialty: 'Electrical', available: true, shift: 'Day' },
    { id: 'TECH-304', employee_id: 'EMP-304', name: 'Jordan Lee', specialty: 'Mechanical', available: false, shift: 'Night' },
  ],
  safety: { open_incidents: 0, last_incident_date: '2026-07-01', compliance_status: 'Green' },
  finance: { downtime_cost_per_hour: 2200, expedite_fee_multiplier: 1.5 },
};

@Injectable()
export class StateService {
  private DATA_DIR = path.join(process.cwd(), 'data');
  private STATE_PATH = path.join(this.DATA_DIR, 'state.json');
  private BASELINE_PATH = path.join(this.DATA_DIR, 'state.baseline.json');
  private SCENARIOS_DIR = path.join(this.DATA_DIR, 'scenarios');

  private ensureDataInitialized() {
    if (!fs.existsSync(this.DATA_DIR)) {
      fs.mkdirSync(this.DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(this.STATE_PATH)) {
      fs.writeFileSync(this.STATE_PATH, JSON.stringify(DEFAULT_FACTORY_STATE, null, 2));
    }
  }

  private setByPath(obj: any, dotPath: string, value: any) {
    const keys = dotPath.split('.');
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (cur[keys[i]] === undefined) cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
  }

  getState(): FactoryState {
    this.ensureDataInitialized();
    return JSON.parse(fs.readFileSync(this.STATE_PATH, 'utf-8'));
  }

  saveState(state: FactoryState) {
    this.ensureDataInitialized();
    state.meta.last_updated = new Date().toISOString();
    fs.writeFileSync(this.STATE_PATH, JSON.stringify(state, null, 2));
  }

  loadScenario(scenarioId: string): Scenario {
    const scenarioPath = path.join(this.SCENARIOS_DIR, `${scenarioId}.json`);
    if (!fs.existsSync(scenarioPath)) {
      throw new Error(`Unknown scenario "${scenarioId}". Check data/scenarios/index.json.`);
    }
    return JSON.parse(fs.readFileSync(scenarioPath, 'utf-8'));
  }

  applyScenarioPatch(scenarioId: string): { state: FactoryState; scenario: Scenario } {
    this.ensureDataInitialized();
    if (!fs.existsSync(this.BASELINE_PATH)) {
      fs.copyFileSync(this.STATE_PATH, this.BASELINE_PATH);
    }
    const scenario = this.loadScenario(scenarioId);
    const state = this.getState();

    for (const [dotPath, value] of Object.entries(scenario.patch)) {
      this.setByPath(state, dotPath, value);
    }
    this.saveState(state);
    return { state, scenario };
  }

  reset(): FactoryState {
    this.ensureDataInitialized();
    if (!fs.existsSync(this.BASELINE_PATH)) {
      fs.writeFileSync(this.BASELINE_PATH, JSON.stringify(DEFAULT_FACTORY_STATE, null, 2));
    }
    const baseline = JSON.parse(fs.readFileSync(this.BASELINE_PATH, 'utf-8'));
    this.saveState(baseline);
    return baseline;
  }

  affectedMachines(scenario: Scenario): string[] {
    const ids = new Set<string>();
    for (const key of Object.keys(scenario.patch)) {
      const match = key.match(/^machines\.([^.]+)\./);
      if (match) ids.add(match[1]);
    }
    return [...ids];
  }
}
