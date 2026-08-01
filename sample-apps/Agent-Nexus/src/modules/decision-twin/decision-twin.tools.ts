import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { DecisionTwinOrchestrator } from './decision-twin.orchestrator.js';
import { lookupSensorData, lookupMachineHealth, lookupInventory, calculateDowntimeCost } from './decision-twin.data.js';

export class DecisionTwinTools {

  @Tool({
    name: 'run_decision_twin_orchestrator',
    description: 'Triggers the multi-agent Decision Twin orchestrator for manufacturing & Industry 4.0 anomalies. Dynamically activates Planner, Plant Manager, Sensor, Maintenance, Memory, Production, Inventory, Finance, Devil\'s Advocate, Safety, Risk, Quality, and Scenario Simulation agents.',
    inputSchema: z.object({
      machine_id: z.string().optional().describe('Identifier of the machine reporting anomaly (e.g. M-004 or M-001)'),
      machineId: z.string().optional().describe('Alias for machine_id'),
      machine: z.string().optional().describe('Alias for machine_id'),
      event_type: z.enum(['sensor_anomaly', 'maintenance_alert', 'quality_deviation']).optional().default('sensor_anomaly').describe('Type of incoming manufacturing event'),
      data_source_priority: z.enum(['user_input', 'live_sensor', 'merge']).optional().describe('Configurable policy for resolving conflicts between user-provided inputs and live sensor telemetry. Default: user_input (Demo Mode)'),
      dataSourcePriority: z.enum(['user_input', 'live_sensor', 'merge']).optional().describe('Alias for data_source_priority'),
      vibration_level: z.number().optional().describe('Vibration reading in mm/s'),
      vibration: z.number().optional().describe('Alias for vibration_level'),
      temperature: z.number().optional().describe('Temperature reading in Celsius'),
      temp: z.number().optional().describe('Alias for temperature'),
      pressure: z.number().optional().describe('Pressure reading in bar'),
      bearing_wear: z.number().optional().describe('Bearing wear percentage (0-100)'),
      inventory: z.number().optional().describe('Spare parts count available in inventory'),
      source: z.string().optional().describe('Source of event data'),
    }),
    examples: {
      request: {
        machine_id: 'M-004',
        event_type: 'sensor_anomaly',
        data_source_priority: 'user_input',
        vibration_level: 14.2,
        temperature: 108.5,
        pressure: 3.8,
        source: 'IoT Sensor Gateway',
      },
      response: {
        status: 'completed',
        chosen_action: 'immediate_repair',
        confidence: 0.85,
        summary: 'Decision Twin converged on immediate_repair after multi-agent negotiation.',
      }
    }
  })
  @Widget('decision-twin-result')
  async runOrchestrator(input: any, ctx: ExecutionContext) {
    const machineId = input.machine_id || input.machineId || input.machine || 'M-004';
    const vibrationLevel = input.vibration_level ?? input.vibration ?? input.vibrationMmS;
    const temperature = input.temperature ?? input.temp ?? input.temperatureCelsius;
    const pressure = input.pressure ?? input.hydraulic_pressure_bar ?? input.hydraulicPressureBar;
    const priority = input.data_source_priority || input.dataSourcePriority || process.env.DATA_SOURCE_PRIORITY || 'user_input';

    ctx.logger.info(`[DecisionTwin] Triggering orchestrator for ${machineId} (Policy: ${priority})`, { machineId, vibrationLevel, temperature, pressure, priority });

    const resultState = await DecisionTwinOrchestrator.run({
      event_type: input.event_type || 'sensor_anomaly',
      data_source_priority: priority as any,
      event: {
        machine_id: machineId,
        timestamp: new Date().toISOString(),
        vibration_level: vibrationLevel,
        temperature: temperature,
        pressure: pressure,
        bearing_wear: input.bearing_wear ?? input.bearingWear,
        inventory: input.inventory ?? input.inventory_count,
        source: input.source || 'MCP Client Request',
      },
    });

    const decision = resultState.final_decision;

    return {
      status: 'completed',
      machine_id: machineId,
      event_type: input.event_type || 'sensor_anomaly',
      data_source_policy: decision?.data_source_policy_applied || priority,
      conflicts_resolved: decision?.conflicts_resolved,
      data_sources_summary: decision?.data_sources_summary,
      chosen_action: decision?.chosen_action,
      confidence: decision?.confidence,
      reason: decision?.reason,
      supporting_evidence: decision?.supporting_evidence,
      negotiation_rounds: decision?.negotiation_rounds,
      consulted_agents: decision?.agents_consulted,
      vetoes: decision?.vetoes,
      challenges: decision?.challenges_addressed,
      work_orders: resultState.work_orders,
      notifications: resultState.notifications,
      trace: resultState.trace,
    };
  }

  @Tool({
    name: 'run_decision_cycle',
    description: 'Runs a full Decision Twin negotiation cycle for a raw manufacturing event object. Unlike run_decision_twin_orchestrator (flat params), this accepts the event object directly and returns the complete orchestrator state, including the full agent trace and negotiation history.',
    inputSchema: z.object({
      event: z.object({
        machine_id: z.string().describe('Identifier of the machine reporting the event'),
        event_type: z.enum(['sensor_anomaly', 'maintenance_alert', 'quality_deviation']).optional().default('sensor_anomaly'),
        vibration_level: z.number().optional(),
        temperature: z.number().optional(),
        pressure: z.number().optional(),
        source: z.string().optional(),
      }).describe('Raw event object describing the manufacturing anomaly'),
    })
  })
  async runDecisionCycle(input: { event: Record<string, any> }, ctx: ExecutionContext) {
    ctx.logger.info(`[DecisionTwin] run_decision_cycle for ${input.event.machine_id}`, input.event);

    const resultState = await DecisionTwinOrchestrator.run({
      event_type: input.event.event_type || 'sensor_anomaly',
      event: {
        ...input.event,
        timestamp: input.event.timestamp || new Date().toISOString(),
      },
    });

    return resultState;
  }

  @Tool({
    name: 'get_sensor_data',
    description: 'Fetch real-time sensor stream data for a specified machine ID, including temperature, vibration, hydraulic pressure, and anomaly flags.',
    inputSchema: z.object({
      machineId: z.string().describe('Unique machine identifier (e.g. M-004, M-001, M-002, M-003, Machine-#4)'),
      vibration_level: z.number().optional().describe('Optional live vibration reading (mm/s)'),
      temperature: z.number().optional().describe('Optional live temperature reading (°C)'),
      pressure: z.number().optional().describe('Optional live hydraulic pressure reading (bar)'),
    })
  })
  async getSensorData(input: { machineId: string; vibration_level?: number; temperature?: number; pressure?: number }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching sensor data', { machineId: input.machineId, input });
    return lookupSensorData(input.machineId, {
      vibration_level: input.vibration_level,
      temperature: input.temperature,
      pressure: input.pressure,
    });
  }

  @Tool({
    name: 'check_machine_health',
    description: 'Retrieve maintenance history, component wear breakdown, and maintenance-derived health score for a machine.',
    inputSchema: z.object({
      machineId: z.string().describe('Target machine identifier (e.g. M-004, Machine-#4)'),
      vibration_level: z.number().optional().describe('Optional live vibration level'),
      temperature: z.number().optional().describe('Optional live temperature level'),
    })
  })
  async checkMachineHealth(input: { machineId: string; vibration_level?: number; temperature?: number }, ctx: ExecutionContext) {
    ctx.logger.info('Evaluating machine health', { machineId: input.machineId, input });
    return lookupMachineHealth(input.machineId, {
      vibration_level: input.vibration_level,
      temperature: input.temperature,
    });
  }

  @Tool({
    name: 'check_inventory',
    description: 'Check stock level, reservation count, warehouse bin location, and reorder lead time for a spare part ID or machine requirement.',
    inputSchema: z.object({
      partId: z.string().describe('Spare part ID (e.g. PART-BRG-409, PART-MTR-102, PART-SEAL-088)')
    })
  })
  async checkInventory(input: { partId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Checking inventory stock', { partId: input.partId });
    return lookupInventory(input.partId);
  }

  @Tool({
    name: 'estimate_downtime_cost',
    description: 'Calculate financial impact projection for machine downtime based on lost throughput revenue, idle labor, expedited maintenance rates, and delivery penalties.',
    inputSchema: z.object({
      machineId: z.string().describe('Target machine ID'),
      hours: z.number().min(0.1).describe('Duration of estimated downtime in hours'),
      vibration_level: z.number().optional().describe('Optional live vibration reading'),
      temperature: z.number().optional().describe('Optional live temperature reading'),
    })
  })
  async estimateDowntimeCost(input: { machineId: string; hours: number; vibration_level?: number; temperature?: number }, ctx: ExecutionContext) {
    ctx.logger.info('Estimating downtime financial impact', { machineId: input.machineId, hours: input.hours, input });
    return calculateDowntimeCost(input.machineId, input.hours, input.vibration_level, input.temperature);
  }

  @Tool({
    name: 'calculate_risk',
    description: 'Calculate composite operational risk score combining safety SOP compliance, financial risk, and schedule delay risk.',
    inputSchema: z.object({
      machineId: z.string().describe('Target machine ID for risk calculation'),
      vibration_level: z.number().optional().describe('Vibration reading'),
      temperature: z.number().optional().describe('Temperature reading'),
    })
  })
  async calculateRisk(input: { machineId: string; vibration_level?: number; temperature?: number }, ctx: ExecutionContext) {
    ctx.logger.info('Calculating composite operational risk', { machineId: input.machineId });
    const vib = input.vibration_level ?? 1.2;
    const temp = input.temperature ?? 48.2;
    const severityFactor = Math.max(1.0, (vib / 5.0) * (temp / 80.0));
    const compositeRiskScore = Number(Math.min(10.0, severityFactor * 2.5).toFixed(1));
    const isCritical = vib > 7.5 || temp > 85.0;

    return {
      machineId: input.machineId,
      compositeRiskScore,
      riskLevel: isCritical ? 'CRITICAL' : compositeRiskScore > 5.0 ? 'MODERATE' : 'LOW',
      sopVetoStatus: isCritical,
      riskFactors: isCritical
        ? [`SOP-MFG-042: Telemetry (Vib ${vib} mm/s, Temp ${temp}°C) exceeds safety limit. Mandatory repair required.`]
        : ['Telemetry within acceptable operational baseline.'],
      recommendation: isCritical
        ? 'SAFETY VETO: Continuous operation VETOED by Safety SOP.'
        : 'SAFETY APPROVED: Baseline telemetry compliant with plant SOP.'
    };
  }

  @Tool({
    name: 'generate_work_order',
    description: 'Generate an executable work order for machine maintenance, assigning a qualified technician, reserving spare parts, and documenting safety protocols.',
    inputSchema: z.object({
      machineId: z.string().describe('Target machine ID'),
      action: z.string().describe('Maintenance action to execute'),
      priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
    })
  })
  async generateWorkOrder(input: { machineId: string; action: string; priority?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Generating work order', { machineId: input.machineId, action: input.action });
    return {
      workOrderId: `WO-${Date.now()}-${input.machineId}`,
      machineId: input.machineId,
      action: input.action,
      priority: input.priority || (input.action === 'immediate_repair' ? 'CRITICAL' : 'MEDIUM'),
      assignedTechnician: 'Tech #14 - Senior Mechanical Specialist (Marcus Vance)',
      reservedParts: ['PART-BRG-409 (Spindle Bearing Set)'],
      status: 'CREATED_AND_SCHEDULED'
    };
  }

  @Tool({
    name: 'search_incident_history',
    description: 'RAG retrieval search over historical manufacturing incident reports',
    inputSchema: z.object({
      query: z.string().describe('Search query string'),
      machine_id: z.string().optional(),
    })
  })
  async searchIncidentHistory(input: { query: string; machine_id?: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Searching incident history for "${input.query}"`);
    return {
      results: [
        {
          incident_id: 'INC-2024-089',
          machine_id: input.machine_id || 'M-004',
          symptoms: 'High vibration + elevated spindle bearing temperature',
          root_cause: 'Spindle bearing degradation under high feed rate',
          outcome: 'Resolved in 4 hours via immediate bearing replacement',
          similarity_score: 0.406,
        }
      ]
    };
  }

  @Tool({
    name: 'simulate_scenario',
    description: 'Run counterfactual simulation for candidate maintenance actions',
    inputSchema: z.object({
      action: z.enum(['immediate_repair', 'delay_repair', 'reduced_capacity', 'continue_normal_operation']),
      machine_id: z.string(),
      vibration_level: z.number().optional(),
      temperature: z.number().optional(),
    })
  })
  async simulateScenario(input: { action: string; machine_id: string; vibration_level?: number; temperature?: number }, ctx: ExecutionContext) {
    ctx.logger.info(`Simulating scenario ${input.action} for ${input.machine_id}`);
    const vib = input.vibration_level ?? 6.5;
    const temp = input.temperature ?? 85.0;
    const severityFactor = Math.max(1.0, (vib / 5.0) * (temp / 80.0));

    const isHealthy = vib <= 3.5 && temp <= 60.0;
    const isCritical = vib > 7.5 || temp > 85.0;

    let score = 0.85;
    if (input.action === 'continue_normal_operation' || input.action === 'immediate_repair') {
      score = isHealthy ? 0.98 : isCritical ? 0.92 : 0.80;
    } else if (input.action === 'reduced_capacity') {
      score = !isHealthy && !isCritical ? 0.96 : isHealthy ? 0.70 : 0.52;
    } else {
      score = isHealthy ? 0.88 : 0.12;
    }

    return {
      action: input.action,
      machine_id: input.machine_id,
      severity_factor: Number(severityFactor.toFixed(2)),
      resilience_score: score,
      estimated_downtime: input.action === 'immediate_repair' ? '4 hours' : '0 hours',
    };
  }
}
