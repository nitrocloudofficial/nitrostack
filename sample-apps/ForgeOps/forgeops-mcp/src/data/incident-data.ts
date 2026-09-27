/**
 * ForgeOps — Golden-Path Incident Data
 *
 * Pre-cached, deterministic data for the demo incident:
 *   Batch B-2407-184 on Assembly Line 3
 *   Yield drops from 96% to 82%
 *   Causal chain: Humidity → Queue Delay → Temperature Drift → Quality Failure
 *
 * This data is what makes the demo reliable — no flaky live calls.
 */

// ── Timestamps ──────────────────────────────────────────────────────
const INCIDENT_DATE = new Date('2026-07-24T08:00:00Z');
const T = (minutes: number) => new Date(INCIDENT_DATE.getTime() + minutes * 60_000).toISOString();

// ── Batch History (MES) ─────────────────────────────────────────────
export const BATCH_HISTORY = {
  source: 'mes',
  record_id: 'batch:B-2407-184',
  timestamp: T(49),
  batch_id: 'B-2407-184',
  product: 'Precision Bearing Assembly P-440',
  line_id: 'LINE-3',
  lot_id: 'LOT-SUP-2407-88',
  route: ['raw_material_intake', 'machine_a', 'queue', 'machine_b', 'inspection', 'packaging'],
  start_time: T(0),
  end_time: T(49),
  yield_percent: 82.0,
  status: 'rejected',
  material_genealogy: {
    primary_material: 'LOT-SUP-2407-88',
    supplier: 'Tata Steel Ltd',
    grade: 'EN31 Bearing Steel',
  },
};

// ── Production Path (MES) ───────────────────────────────────────────
export const PRODUCTION_PATH = {
  source: 'mes',
  record_id: 'path:B-2407-184',
  timestamp: T(49),
  batch_id: 'B-2407-184',
  stages: [
    {
      stage_name: 'Raw Material Intake',
      machine_id: null,
      start_time: T(0),
      end_time: T(5),
      cycle_time_minutes: 5.0,
      parameters: { humidity: 52.3, temperature: 23.1 },
      status: 'completed',
      anomalies: [],
    },
    {
      stage_name: 'Machine A - Turning',
      machine_id: 'MCH-A-003',
      start_time: T(5),
      end_time: T(20),
      cycle_time_minutes: 15.0,
      parameters: { speed_rpm: 1200, feed_rate: 0.15, temperature: 24.2 },
      status: 'completed',
      anomalies: [],
    },
    {
      stage_name: 'Queue - Waiting for Machine B',
      machine_id: null,
      start_time: T(20),
      end_time: T(218),
      cycle_time_minutes: 198.0,
      parameters: { ambient_humidity: 68.5, ambient_temperature: 27.8 },
      status: 'completed',
      anomalies: ['Queue delay exceeds 3 hours', 'Humidity elevated during wait'],
    },
    {
      stage_name: 'Machine B - Grinding',
      machine_id: 'MCH-B-007',
      start_time: T(218),
      end_time: T(222),
      cycle_time_minutes: 4.0,
      parameters: { speed_rpm: 800, temperature: 31.4, vibration_mm_s: 4.7 },
      status: 'completed',
      anomalies: ['Machine 7 vibration alert', 'Temperature drift detected'],
    },
    {
      stage_name: 'Quality Inspection',
      machine_id: 'INSP-01',
      start_time: T(222),
      end_time: T(227),
      cycle_time_minutes: 5.0,
      parameters: { defect_rate: 18.0, quality_score: 62.3 },
      status: 'failed',
      anomalies: ['Multiple defects detected', 'Quality score below threshold'],
    },
    {
      stage_name: 'Packaging',
      machine_id: 'PKG-02',
      start_time: T(227),
      end_time: T(229),
      cycle_time_minutes: 2.0,
      parameters: {},
      status: 'rejected',
      anomalies: ['Batch rejected at final disposition'],
    },
  ],
  total_duration_minutes: 229.0,
  failure_stage: 'Quality Inspection',
  failure_reason: 'Multiple dimensional and surface defects exceeding tolerance',
};

// ── Queue Events (MES) ──────────────────────────────────────────────
export const QUEUE_EVENTS = [
  {
    source: 'mes',
    record_id: 'evt:Q-2407-001',
    timestamp: T(20),
    event_id: 'Q-2407-001',
    batch_id: 'B-2407-184',
    line_id: 'LINE-3',
    queue_location: 'Queue between Machine A and Machine B',
    entered_queue: T(20),
    exited_queue: T(218),
    wait_time_minutes: 198.0,
    expected_wait_minutes: 30.0,
    is_anomalous: true,
    severity: 'critical',
  },
];

// ── Machine Alerts (Maintenance) ────────────────────────────────────
export const MACHINE_ALERTS: Record<string, any[]> = {
  'MCH-B-007': [
    {
      source: 'maintenance',
      record_id: 'alert:MA-2407-012',
      timestamp: T(222),
      alert_id: 'MA-2407-012',
      machine_id: 'MCH-B-007',
      alert_type: 'vibration',
      severity: 'critical',
      value: 4.7,
      threshold: 3.5,
      unit: 'mm/s',
      detected_at: T(222),
      acknowledged: false,
      description: 'Vibration level on Machine 7 (Grinding) exceeded threshold. Possible bearing wear or misalignment.',
    },
    {
      source: 'maintenance',
      record_id: 'alert:MA-2407-013',
      timestamp: T(220),
      alert_id: 'MA-2407-013',
      machine_id: 'MCH-B-007',
      alert_type: 'temperature',
      severity: 'warning',
      value: 31.4,
      threshold: 28.0,
      unit: '°C',
      detected_at: T(220),
      acknowledged: false,
      description: 'Operating temperature drift on Machine 7. Likely caused by extended ambient exposure during queue delay.',
    },
  ],
};

// ── Maintenance State ───────────────────────────────────────────────
export const MAINTENANCE_STATE: Record<string, any> = {
  'MCH-B-007': {
    source: 'maintenance',
    record_id: 'maint:MCH-B-007',
    timestamp: T(229),
    machine_id: 'MCH-B-007',
    machine_name: 'Machine 7 - Precision Grinder',
    current_status: 'degraded',
    health_score: 72.0,
    last_maintenance: new Date(INCIDENT_DATE.getTime() - 15 * 86400_000).toISOString(),
    next_scheduled: new Date(INCIDENT_DATE.getTime() + 5 * 86400_000).toISOString(),
    open_work_orders: 1,
    service_history: [
      {
        date: new Date(INCIDENT_DATE.getTime() - 15 * 86400_000).toISOString(),
        type: 'preventive',
        description: 'Bearing inspection and lubrication',
        technician: 'Rajesh Kumar',
      },
      {
        date: new Date(INCIDENT_DATE.getTime() - 45 * 86400_000).toISOString(),
        type: 'corrective',
        description: 'Spindle alignment adjustment',
        technician: 'Amit Patel',
      },
    ],
  },
};

// ── Defect Records (Quality) ────────────────────────────────────────
export const DEFECT_RECORDS: Record<string, any[]> = {
  'B-2407-184': [
    {
      source: 'quality',
      record_id: 'defect:DEF-2407-041',
      timestamp: T(227),
      defect_id: 'DEF-2407-041',
      batch_id: 'B-2407-184',
      defect_class: 'dimensional',
      severity: 'major',
      location: 'Outer ring bore diameter',
      detected_at: T(225),
      inspector: 'Priya Sharma',
      description: 'Bore diameter 0.08mm above upper tolerance. Consistent with thermal expansion during extended queue wait.',
      measurements: { actual_mm: 52.08, nominal_mm: 52.0, tolerance_mm: 0.05 },
    },
    {
      source: 'quality',
      record_id: 'defect:DEF-2407-042',
      timestamp: T(227),
      defect_id: 'DEF-2407-042',
      batch_id: 'B-2407-184',
      defect_class: 'surface',
      severity: 'major',
      location: 'Inner raceway surface',
      detected_at: T(226),
      inspector: 'Priya Sharma',
      description: 'Surface roughness exceeds Ra 0.4μm specification. Grinding marks suggest vibration during Machine 7 operation.',
      measurements: { actual_ra: 0.62, spec_ra: 0.4, unit: 'μm' },
    },
    {
      source: 'quality',
      record_id: 'defect:DEF-2407-043',
      timestamp: T(227),
      defect_id: 'DEF-2407-043',
      batch_id: 'B-2407-184',
      defect_class: 'contamination',
      severity: 'minor',
      location: 'External surface',
      detected_at: T(226),
      inspector: 'Priya Sharma',
      description: 'Light surface oxidation consistent with humidity exposure during extended queue period.',
      measurements: { humidity_exposure_hours: 3.3 },
    },
  ],
};

// ── Inspection Results (Quality) ────────────────────────────────────
export const INSPECTION_RESULTS: Record<string, any[]> = {
  'B-2407-184': [
    {
      source: 'quality',
      record_id: 'insp:INSP-2407-091',
      timestamp: T(227),
      inspection_id: 'INSP-2407-091',
      batch_id: 'B-2407-184',
      stage: 'Final Inspection',
      result: 'fail',
      quality_score: 62.3,
      inspected_at: T(227),
      inspector: 'Priya Sharma',
      defects_found: 3,
      defect_ids: ['DEF-2407-041', 'DEF-2407-042', 'DEF-2407-043'],
      criteria: {
        dimensional_tolerance: 'fail',
        surface_finish: 'fail',
        contamination: 'conditional',
        hardness: 'pass',
        visual: 'pass',
      },
      notes: 'Batch rejected. Dimensional and surface defects consistent with thermal and environmental exposure during extended queue delay.',
    },
  ],
};

// ── Supplier Lot Info (Materials) ───────────────────────────────────
export const SUPPLIER_LOT_INFO: Record<string, any> = {
  'LOT-SUP-2407-88': {
    source: 'materials',
    record_id: 'lot:LOT-SUP-2407-88',
    timestamp: T(0),
    lot_id: 'LOT-SUP-2407-88',
    supplier_name: 'Tata Steel Ltd',
    supplier_id: 'SUP-TATA-001',
    material_type: 'Bearing Steel',
    material_grade: 'EN31',
    received_date: new Date(INCIDENT_DATE.getTime() - 3 * 86400_000).toISOString(),
    intake_conditions: {
      temperature: 22.5,
      humidity: 48.0,
      hardness_hrc: 62.1,
      certification: 'passed',
    },
    certifications: ['ISO 9001:2015', 'IATF 16949'],
    shelf_life_days: 180,
    storage_requirements: { temperature_max: 30, humidity_max: 60 },
  },
};

// ── Material Constraints ────────────────────────────────────────────
export const MATERIAL_CONSTRAINTS: Record<string, any> = {
  'Bearing Steel': {
    source: 'materials',
    record_id: 'mat:EN31-constraints',
    timestamp: T(229),
    material_type: 'Bearing Steel',
    current_supplier: 'Tata Steel Ltd',
    available_quantity: 2500.0,
    unit: 'kg',
    lead_time_days: 14,
    can_change_supplier: false,
    change_freeze_until: new Date(INCIDENT_DATE.getTime() + 30 * 86400_000).toISOString(),
    alternative_suppliers: [
      { name: 'JSW Steel', lead_time_days: 21, cost_premium_percent: 8.5 },
      { name: 'SAIL', lead_time_days: 28, cost_premium_percent: 3.2 },
    ],
    cost_per_unit: 145.0,
    currency: 'INR',
  },
};

// ── Simulation Results (pre-computed) ───────────────────────────────
export const SIMULATION_SCENARIOS: Record<string, any> = {
  baseline: {
    source: 'simulation',
    record_id: 'sim:run_001',
    timestamp: T(229),
    scenario_id: 'sim:run_001',
    scenario_name: 'Incident Baseline',
    parameters: [],
    predicted_yield: 82.0,
    confidence_interval: [79.5, 84.5],
    confidence: 0.95,
    evidence_type: 'observed_correlation',
    assumptions: ['All current conditions held as observed'],
    sensitivity: {},
    within_validated_range: true,
    warning: null,
    model_version: 'forgeops-sim-v1.0',
  },
  reduce_queue_delay: {
    source: 'simulation',
    record_id: 'sim:run_014',
    timestamp: T(229),
    scenario_id: 'sim:run_014',
    scenario_name: 'Reduce Queue Delay (< 60 min)',
    parameters: [
      { variable: 'queue_delay_minutes', current_value: 198, proposed_value: 45, unit: 'minutes' },
    ],
    predicted_yield: 96.0,
    confidence_interval: [93.2, 97.8],
    confidence: 0.96,
    evidence_type: 'counterfactual_simulated',
    assumptions: [
      'Machine 7 condition held constant',
      'No supplier change within 30 days',
      'Ambient humidity returns to normal with reduced wait',
    ],
    sensitivity: { queue_delay_minutes: 0.89, humidity: 0.34, machine_condition: 0.12 },
    within_validated_range: true,
    warning: null,
    model_version: 'forgeops-sim-v1.0',
  },
  replace_machine_7: {
    source: 'simulation',
    record_id: 'sim:run_015',
    timestamp: T(229),
    scenario_id: 'sim:run_015',
    scenario_name: 'Replace Machine 7',
    parameters: [
      { variable: 'machine_id', current_value: 'MCH-B-007', proposed_value: 'MCH-B-009', unit: '' },
    ],
    predicted_yield: 84.0,
    confidence_interval: [81.0, 87.0],
    confidence: 0.61,
    evidence_type: 'counterfactual_simulated',
    assumptions: [
      'Queue delay remains at 198 minutes',
      'Humidity conditions unchanged',
      'Replacement machine MCH-B-009 is fully operational',
    ],
    sensitivity: { machine_condition: 0.18, queue_delay_minutes: 0.89, humidity: 0.34 },
    within_validated_range: true,
    warning: 'Machine replacement alone shows minimal yield improvement. Queue delay remains the dominant factor.',
    model_version: 'forgeops-sim-v1.0',
  },
  humidity_control: {
    source: 'simulation',
    record_id: 'sim:run_016',
    timestamp: T(229),
    scenario_id: 'sim:run_016',
    scenario_name: 'Install Humidity Control (< 55%)',
    parameters: [
      { variable: 'ambient_humidity', current_value: 68.5, proposed_value: 50.0, unit: '%RH' },
    ],
    predicted_yield: 96.0,
    confidence_interval: [94.0, 97.5],
    confidence: 0.94,
    evidence_type: 'counterfactual_simulated',
    assumptions: [
      'Queue delay remains at 198 minutes',
      'Machine 7 condition held constant',
      'Humidity control maintains < 55% consistently',
    ],
    sensitivity: { humidity: 0.82, queue_delay_minutes: 0.45, machine_condition: 0.12 },
    within_validated_range: true,
    warning: null,
    model_version: 'forgeops-sim-v1.0',
  },
};

// ── Timeline Events ─────────────────────────────────────────────────
export const TIMELINE_EVENTS = [
  { event_id: 'evt_2287', timestamp: T(0), source: 'mes', type: 'batch_start', title: 'Batch B-2407-184 started', description: 'Production initiated on Assembly Line 3', severity: 'info', stage: 'Raw Material Intake' },
  { event_id: 'evt_2288', timestamp: T(5), source: 'mes', type: 'stage_complete', title: 'Raw material intake complete', description: 'Material LOT-SUP-2407-88 passed intake inspection', severity: 'info', stage: 'Raw Material Intake' },
  { event_id: 'evt_2289', timestamp: T(20), source: 'mes', type: 'stage_complete', title: 'Machine A processing complete', description: 'Turning operation completed within normal parameters', severity: 'info', stage: 'Machine A - Turning' },
  { event_id: 'evt_2290', timestamp: T(51), source: 'iot', type: 'sensor_anomaly', title: 'Humidity increased to 68.5%', description: 'Ambient humidity in queue area exceeded 60% threshold. Storage requirement max is 60%.', severity: 'warning', stage: 'Queue' },
  { event_id: 'evt_2291', timestamp: T(218), source: 'mes', type: 'queue_delay', title: 'Queue delay exceeded 3 hours', description: 'Wait time between Machine A and Machine B reached 198 minutes (expected: 30 min)', severity: 'critical', stage: 'Queue' },
  { event_id: 'evt_2292', timestamp: T(220), source: 'maintenance', type: 'temperature_drift', title: 'Temperature drift on Machine 7', description: 'Operating temperature rose to 31.4°C (threshold: 28°C). Likely due to ambient conditions.', severity: 'warning', stage: 'Machine B - Grinding' },
  { event_id: 'evt_2293', timestamp: T(222), source: 'maintenance', type: 'machine_alert', title: 'Machine 7 vibration alert', description: 'Vibration level 4.7 mm/s exceeded 3.5 mm/s threshold on grinding spindle', severity: 'critical', stage: 'Machine B - Grinding' },
  { event_id: 'evt_2294', timestamp: T(225), source: 'quality', type: 'defect_detected', title: 'Dimensional defect detected', description: 'Bore diameter 0.08mm above tolerance. Thermal expansion suspected.', severity: 'critical', stage: 'Quality Inspection' },
  { event_id: 'evt_2295', timestamp: T(226), source: 'quality', type: 'defect_detected', title: 'Surface finish defect detected', description: 'Surface roughness Ra 0.62μm exceeds 0.40μm spec. Grinding vibration suspected.', severity: 'critical', stage: 'Quality Inspection' },
  { event_id: 'evt_2296', timestamp: T(227), source: 'quality', type: 'batch_rejected', title: 'Batch B-2407-184 rejected', description: 'Quality score 62.3/100. Failed dimensional tolerance and surface finish criteria.', severity: 'critical', stage: 'Quality Inspection' },
];

// ── Root Cause Graph ────────────────────────────────────────────────
export const CAUSAL_GRAPH = {
  nodes: [
    { id: 'node_humidity', label: 'Humidity Rise', influence: 0.34, confidence: 0.88, evidence_type: 'observed_correlation', controllable: true, source: 'iot', value: '68.5%', threshold: '60%' },
    { id: 'node_queue_delay', label: 'Queue Delay', influence: 0.89, confidence: 0.96, evidence_type: 'counterfactual_simulated', controllable: true, source: 'mes', value: '198 min', threshold: '30 min' },
    { id: 'node_temp_drift', label: 'Temperature Drift', influence: 0.45, confidence: 0.82, evidence_type: 'model_estimated', controllable: false, source: 'maintenance', value: '31.4°C', threshold: '28°C' },
    { id: 'node_machine_7', label: 'Machine 7 Condition', influence: 0.18, confidence: 0.61, evidence_type: 'counterfactual_simulated', controllable: true, source: 'maintenance', value: 'Health 72%', threshold: '80%' },
    { id: 'node_material', label: 'Material Quality', influence: 0.05, confidence: 0.92, evidence_type: 'observed_correlation', controllable: false, source: 'materials', value: 'Within spec', threshold: 'N/A' },
    { id: 'node_quality_failure', label: 'Quality Failure', influence: 1.0, confidence: 0.95, evidence_type: 'observed_correlation', controllable: false, source: 'quality', value: 'Score 62.3', threshold: '80' },
  ],
  edges: [
    { from: 'node_humidity', to: 'node_queue_delay', strength: 0.42, type: 'contributes_to' },
    { from: 'node_queue_delay', to: 'node_temp_drift', strength: 0.78, type: 'causes' },
    { from: 'node_temp_drift', to: 'node_quality_failure', strength: 0.65, type: 'causes' },
    { from: 'node_machine_7', to: 'node_quality_failure', strength: 0.22, type: 'contributes_to' },
    { from: 'node_humidity', to: 'node_quality_failure', strength: 0.28, type: 'contributes_to' },
    { from: 'node_queue_delay', to: 'node_quality_failure', strength: 0.89, type: 'primary_cause' },
    { from: 'node_material', to: 'node_quality_failure', strength: 0.05, type: 'minimal' },
  ],
};

// ── Recommendations ─────────────────────────────────────────────────
export const RECOMMENDATIONS = [
  {
    rank: 1,
    action: 'Reduce queue delay below 60 minutes',
    confidence: 0.96,
    predicted_yield: 96.0,
    cost: 'Low',
    cost_inr: 15000,
    implementation: 'Easy — scheduling change (~2 hours)',
    impact: 'High',
    risk: 'Low',
    evidence_refs: ['sim:run_014', 'timeline:evt_2291', 'graph:node_queue_delay'],
    description: 'Adjust production scheduling to minimize inter-stage queue time. Historical data from 327 batches supports this intervention.',
    savings_per_week_inr: 420000,
  },
  {
    rank: 2,
    action: 'Install humidity control in queue area',
    confidence: 0.94,
    predicted_yield: 96.0,
    cost: 'High',
    cost_inr: 850000,
    implementation: 'Medium — equipment installation (1-2 weeks)',
    impact: 'High',
    risk: 'Medium',
    evidence_refs: ['sim:run_016', 'timeline:evt_2290', 'graph:node_humidity'],
    description: 'Install HVAC humidity control to maintain < 55% in queue/staging area.',
    savings_per_week_inr: 420000,
  },
  {
    rank: 3,
    action: 'Replace or overhaul Machine 7',
    confidence: 0.61,
    predicted_yield: 84.0,
    cost: 'High',
    cost_inr: 1200000,
    implementation: 'Disruptive — 2-3 days downtime',
    impact: 'Low',
    risk: 'High',
    evidence_refs: ['sim:run_015', 'timeline:evt_2293', 'graph:node_machine_7'],
    description: 'Machine 7 appeared in 81% of failed batches, but counterfactual simulation shows replacing it alone only improves yield to 84%.',
    savings_per_week_inr: 50000,
  },
];

// ── Business Impact ─────────────────────────────────────────────────
export const BUSINESS_IMPACT = {
  current_state: {
    monthly_loss_exposure_inr: 1800000,
    downtime_hours_per_week: 12,
    yield_percent: 82.0,
    affected_batches_per_week: 8,
  },
  recommended_action_impact: {
    monthly_savings_inr: 1500000,
    downtime_reduction_percent: 41,
    yield_percent: 96.0,
    yield_improvement_points: 14,
    payback_period: 'Immediate (scheduling change)',
  },
};

// ── Incident Summary ────────────────────────────────────────────────
export const INCIDENT = {
  incident_id: 'INC-2407-001',
  title: 'Yield Degradation - Batch B-2407-184',
  line: 'Assembly Line 3',
  plant: 'Plant Mumbai-1',
  batch_id: 'B-2407-184',
  severity: 'high',
  detected_at: T(227),
  kpi_change: 'Yield 96% → 82%',
  status: 'investigating',
  description: 'Production yield on Assembly Line 3 dropped from 96% to 82% during Batch B-2407-184 processing. Multiple anomalies detected: elevated humidity, extended queue delay, Machine 7 maintenance alert, temperature drift, and quality defects. Batch was rejected at final inspection.',
  causal_chain: ['Humidity rise', 'Queue delay increase', 'Temperature drift', 'Quality failure'],
};
