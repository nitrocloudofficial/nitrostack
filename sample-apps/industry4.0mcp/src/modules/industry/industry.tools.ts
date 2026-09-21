import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { PlantDatabase } from './industry.data.js'; // Mock Database Import

export class IndustryTools {

  // Tool 1: The Data Translator
  @Tool({
    name: 'normalize_sensor_tags',
    description: 'Translates raw weird sensor names into industry standard (ISA-95) formats. Call this when new machine data arrives.',
    inputSchema: z.object({
      sensors: z.array(z.object({
        machine_id: z.string(),
        raw_tag: z.string()
      }))
    }),
  })
  async normalizeSensorTags(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Normalizing tags', input.sensors);
    const machine = PlantDatabase.getMachineById(input.sensors[0].machine_id);
    if (!machine) return { error: `Machine ${input.sensors[0].machine_id} not found in plant.` };

    return input.sensors.map((s: any) => ({
      raw_tag: s.raw_tag,
      standard_name: s.raw_tag.toLowerCase().includes('temp') || s.raw_tag.toLowerCase().includes('t_') ? "Temperature" : "Vibration",
      unit: "C",
      machine_id: s.machine_id,
      status: "Standardized in DB"
    }));
  }

  // Tool 2: The Self-Healing Router
  @Tool({
    name: 'reroute_node_red_flow',
    description: 'Dynamically changes Node-RED flow configuration to reroute production data from a failed machine to a backup machine.',
    inputSchema: z.object({
      failed_machine: z.string(),
      backup_machine: z.string(),
      product_id: z.string()
    }),
  })
  async rerouteNodeRedFlow(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Rerouting from ${input.failed_machine} to ${input.backup_machine}`);
    
    PlantDatabase.updateMachine(input.failed_machine, { status: "Failed" });
    PlantDatabase.updateMachine(input.backup_machine, { status: "Running" });

    return {
      status: "success",
      flow_id: "fl_8923",
      message: `Node-RED flow updated. Data now routing to ${input.backup_machine}. DB Status Updated.`,
      machine_status_in_db: PlantDatabase.getMachineById(input.backup_machine)
    };
  }

  // Tool 3: The Money Saver
  @Tool({
    name: 'optimize_energy_schedule',
    description: 'Checks real-time energy prices and delays non-urgent jobs to off-peak hours to save electricity costs.',
    inputSchema: z.object({
      job_queue: z.array(z.any()),
      current_energy_price: z.number(),
      threshold_price: z.number()
    }),
  })
  async optimizeEnergySchedule(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Optimizing energy schedule');
    
    if (input.current_energy_price > input.threshold_price) {
      const jobToDelay = PlantDatabase.jobQueue.find(j => j.status === "Pending");
      if (jobToDelay) {
        jobToDelay.status = "Delayed";
        return {
          action: "delay_job",
          job_id: jobToDelay.job_id,
          new_start_time: "2024-05-10T02:00:00Z",
          reason: "Energy price too high. Job delayed in DB to off-peak hours.",
          updated_job: jobToDelay
        };
      }
    }
    return { action: "no_action", reason: "Energy price is within threshold or no pending jobs." };
  }

  // Tool 4: The Auto-Lawyer
  @Tool({
    name: 'generate_compliance_audit_trail',
    description: 'Compiles sensor logs and operator actions into a standard PDF audit report for FDA/ISO compliance after a deviation.',
    inputSchema: z.object({
      batch_id: z.string(),
      deviation_event: z.string()
    }),
  })
  async generateComplianceAuditTrail(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating compliance report');
    return {
      file_path: `/audits/${input.batch_id}_report.pdf`,
      status: "Generated ISO-9001 compliance report with automated root cause and corrective action.",
      evidence_data: `Deviation: ${input.deviation_event} logged successfully.`
    };
  }

  // Tool 5: The Smart Doctor
  @Tool({
    name: 'predict_maintenance_window',
    description: 'Predicts machine failure based on live sensor vibration from database.',
    inputSchema: z.object({
      machine_id: z.string(),
      sensor_history_hours: z.number()
    }),
  })
  async predictMaintenanceWindow(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Predicting maintenance');
    
    const machine = PlantDatabase.getMachineById(input.machine_id);
    if (!machine) return { error: "Machine not found" };

    if (machine.vibration > 7.0) {
      return {
        probability_of_failure: "85% in 24 hours",
        recommended_action: "Critical: Schedule maintenance immediately. Vibration too high.",
        current_vibration: machine.vibration,
        machine_status: machine.status
      };
    }
    
    return {
      probability_of_failure: "10% in 48 hours",
      recommended_action: "No maintenance needed. Machine is healthy.",
      current_vibration: machine.vibration
    };
  }

  // Tool 6: The Quality Auto-Fixer (UPDATED - Autonomous)
  @Tool({
    name: 'adjust_machine_parameters',
    description: 'Calculates and adjusts machine tool offsets to fix quality defects (like dimension oversize) automatically. Fetches current recipe internally from the database.',
    inputSchema: z.object({
      machine_id: z.string(),
      defect_data: z.object({
        dimension: z.string(),
        target_mm: z.number(),
        actual_mm: z.number()
      })
      // current_recipe removed from here so AI doesn't ask the user for it
    }),
  })
  async adjustMachineParameters(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Adjusting machine parameters');
    
    const machine = PlantDatabase.getMachineById(input.machine_id);
    if (!machine) return { error: "Machine not found" };

    // Fetch current recipe internally from DB
    const currentRecipe = {
      tool_offset: machine.tool_offset,
      coolant_pressure: machine.coolant_pressure
    };

    // Calculate new offset
    const error = input.defect_data.actual_mm - input.defect_data.target_mm; // 0.3
    const newOffset = currentRecipe.tool_offset - error; // 10.0 - 0.3 = 9.7
    const oldOffset = currentRecipe.tool_offset;

    // Database update
    PlantDatabase.updateMachine(input.machine_id, { tool_offset: newOffset });

    return {
      status: "success",
      parameter_changed: "tool_offset",
      old_value: oldOffset,
      new_value: newOffset,
      reason: `Compensated for ${error}mm ${input.defect_data.dimension} oversize. Database updated successfully.`,
      updated_machine_data: PlantDatabase.getMachineById(input.machine_id)
    };
  }
}