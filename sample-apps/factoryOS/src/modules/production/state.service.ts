
// state.service.ts
// Single source of truth, mirroring apply_scenario.js but as an injectable
// NitroStack service so every agent module reads/writes the SAME state.json
// your team already built — no more separate mock data per module.
//
// Expects your FactoryOS data folder copied into <project>/data/, i.e.:
//   data/state.json
//   data/state.baseline.json   (auto-created on first run)
//   data/business_metadata.json
//   data/scenarios/*.json
//   data/maintenance-model/*

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

@Injectable()
export class StateService {
    // Adjust if you place the data folder elsewhere relative to your process cwd
    private DATA_DIR = path.join(process.cwd(), 'data');
    private STATE_PATH = path.join(this.DATA_DIR, 'state.json');
    private BASELINE_PATH = path.join(this.DATA_DIR, 'state.baseline.json');
    private SCENARIOS_DIR = path.join(this.DATA_DIR, 'scenarios');

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
        return JSON.parse(fs.readFileSync(this.STATE_PATH, 'utf-8'));
    }

    saveState(state: FactoryState) {
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

    // Merges a scenario's patch into state.json — same dot-path merge as apply_scenario.js
    applyScenarioPatch(scenarioId: string): { state: FactoryState; scenario: Scenario } {
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
        if (!fs.existsSync(this.BASELINE_PATH)) {
            throw new Error('No baseline snapshot yet — run a scenario first, or copy state.json to state.baseline.json manually.');
        }
        const baseline = JSON.parse(fs.readFileSync(this.BASELINE_PATH, 'utf-8'));
        this.saveState(baseline);
        return baseline;
    }

    // Returns the machineIds touched by a scenario patch, derived from its dot-paths
    // (e.g. "machines.M12.temperature_c" -> "M12"). Used by applyScenario() to know
    // which machine(s) to run the cascade for without hardcoding per scenario.
    affectedMachines(scenario: Scenario): string[] {
        const ids = new Set<string>();
        for (const key of Object.keys(scenario.patch)) {
            const match = key.match(/^machines\.([^.]+)\./);
            if (match) ids.add(match[1]);
        }
        return [...ids];
    }
}