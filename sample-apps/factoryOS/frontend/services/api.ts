export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  // Machines
  getMachines: () => fetchJSON(`${API_BASE}/api/machines`),
  getMachine: (id: string) => fetchJSON(`${API_BASE}/api/machines/${id}`),
  predictFailure: (id: string) => fetchJSON(`${API_BASE}/api/machines/${id}/predict-failure`),
  shutdownMachine: (id: string) => fetchJSON(`${API_BASE}/api/machines/${id}/shutdown`, { method: 'POST' }),

  // Inventory
  getInventory: (partNumber?: string) =>
    fetchJSON(`${API_BASE}/api/inventory${partNumber ? `?partNumber=${partNumber}` : ''}`),
  getShortages: () => fetchJSON(`${API_BASE}/api/inventory/shortages`),
  getWarehouses: (partNumber: string) =>
    fetchJSON(`${API_BASE}/api/inventory/warehouses?partNumber=${partNumber}`),

  // Procurement
  getSuppliers: (partNumber?: string) =>
    fetchJSON(`${API_BASE}/api/suppliers${partNumber ? `?partNumber=${partNumber}` : ''}`),
  getPurchaseOrders: () => fetchJSON(`${API_BASE}/api/purchase-orders`),

  // Production
  getProductionLines: () => fetchJSON(`${API_BASE}/api/production-lines`),

  // Safety
  getIncidents: () => fetchJSON(`${API_BASE}/api/safety/incidents`),
  getIncidentReport: (id: string) => fetchJSON(`${API_BASE}/api/safety/incidents/${id}/report`),

  // Simulation
  simulate: (scenarioId: string) =>
    fetchJSON(`${API_BASE}/api/simulate/${scenarioId}`, { method: 'POST' }),
  resetSimulation: () =>
    fetchJSON(`${API_BASE}/api/simulate/reset`, { method: 'POST' }),

  // Aggregated
  getSummary: () => fetchJSON(`${API_BASE}/api/state/summary`),
  getScenarios: () => fetchJSON(`${API_BASE}/api/scenarios`),
};

export type Machine = {
  id: string;
  name: string;
  status: string;
  health: string;
  temperature_c: number;
  vibration_mm_s: number;
  operating_hours: number;
  last_serviced: string;
  sensor_type: string;
  air_temp_k: number;
  process_temp_k: number;
  rotational_speed_rpm: number;
  torque_nm: number;
  tool_wear_min: number;
};

export type InventoryItem = {
  part_number: string;
  description: string;
  on_hand: number;
  reserved: number;
  reorder_point: number;
  location: string;
};

export type Supplier = {
  id: string;
  name: string;
  rating: number;
  delivery_time_hrs: number;
  price: number;
  part_number: string;
};

export type ProductionLine = {
  id: string;
  status: string;
  active_job: string;
  output_rate: string;
  scheduled_completion: string;
};

export type SafetyIncident = {
  incident_id: string;
  location: string;
  severity: string;
  description: string;
  status: string;
  reported_at: string;
  osha_compliance_flagged: number;
  safety_report: string;
  timeline: string;
};

export type Scenario = {
  id: string;
  file: string;
  label: string;
  difficulty: string;
  description?: string;
  triggerButton?: string;
  expectedAgentFlow?: Array<{ agent: string; action: string; output: string }>;
  recoverySummary?: Record<string, any>;
};

export type DashboardSummary = {
  activeIncident: string | null;
  machines: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
    list: Machine[];
  };
  production: {
    totalLines: number;
    operational: number;
    lines: ProductionLine[];
  };
  inventory: {
    totalItems: number;
    shortages: number;
    items: InventoryItem[];
    shortageItems: InventoryItem[];
  };
  incidents: {
    total: number;
    list: SafetyIncident[];
  };
  purchaseOrders: {
    total: number;
    list: any[];
  };
};
