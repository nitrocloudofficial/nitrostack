import { ToolDecorator as Tool, ControllerDecorator as Controller, Widget, ExecutionContext, z } from '@nitrostack/core';
import { McpClientsService } from '../../services/mcp-clients.service.js';

/**
 * Floor Operations Agent — Outbound & Workforce Tools
 *
 * Handles: Stage 4 (Priority Picking) and Stage 6 (Workforce Allocation)
 */
@Controller('floor_ops_outbound')
export class FloorOpsOutboundTools {
  private mcpClients = new McpClientsService();

  // ══════════════════════════════════════════════════════════
  // STAGE 4: Order Picking
  // ══════════════════════════════════════════════════════════

  /**
   * inject_priority_pick
   * Dynamically interrupts a worker to inject an emergency SLA task.
   */
  @Tool({
    name: 'inject_priority_pick',
    description:
      'Interrupts a worker\'s current queue with an emergency pick task. Use this when audit_sla_deadlines flags an order in jeopardy.',
    inputSchema: z.object({
      order_id: z.string().describe('The critical order ID to inject (e.g., "ORD-TATA-999")'),
      zone: z.string().describe('The warehouse zone the items are located in'),
    }),
  })
  @Widget('priority-pick-card')
  async injectPriorityPick(
    input: { order_id: string; zone: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Injecting priority pick', input);

    // Mock logic: Finding a worker in the same zone
    const assignedWorker = 'John Doe (RF-Scan-04)';

    await this.mcpClients.sendSlackMessage(
      '#shipping-dock',
      `Emergency Pick injected into queue for ${assignedWorker}. Order: ${input.order_id} must be picked immediately. Hold the FedEx truck!`
    );

    return {
      orderId: input.order_id,
      assignedWorker,
      zone: input.zone,
      status: 'INJECTED',
      message: `Successfully interrupted ${assignedWorker}'s queue. Slack alert sent to hold the truck.`
    };
  }

  // ══════════════════════════════════════════════════════════
  // STAGE 6: Workforce Management
  // ══════════════════════════════════════════════════════════

  /**
   * reallocate_workers
   * Shifts employees between departments dynamically.
   */
  @Tool({
    name: 'reallocate_workers',
    description:
      'Dynamically shifts employees between departments (e.g., from Picking to Receiving) if a bottleneck forms.',
    inputSchema: z.object({
      from_department: z.string().describe('Department losing workers (e.g., "Picking")'),
      to_department: z.string().describe('Department gaining workers (e.g., "Receiving")'),
      count: z.number().int().min(1).describe('Number of workers to reallocate'),
    }),
  })
  @Widget('labor-reallocation-card')
  async reallocateWorkers(
    input: { from_department: string; to_department: string; count: number },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Reallocating workers', input);

    await this.mcpClients.sendSlackMessage(
      `#${input.from_department.toLowerCase()}-team`,
      `Attention: ${input.count} workers from ${input.from_department} please report to ${input.to_department} immediately to assist with bottlenecks.`
    );

    return {
      from: input.from_department,
      to: input.to_department,
      countReallocated: input.count,
      status: 'REALLOCATED',
      message: `Reallocated ${input.count} workers. Slack notification sent.`
    };
  }

  /**
   * check_certifications
   * Verifies OSHA/safety compliance before assigning tasks.
   */
  @Tool({
    name: 'check_certifications',
    description:
      'Verifies a worker\'s safety certifications (e.g., forklift license) before allowing them to operate heavy machinery.',
    inputSchema: z.object({
      worker_id: z.string().describe('Worker ID (e.g., "W-109")'),
      required_cert: z.string().describe('Required certification (e.g., "FORKLIFT_CLASS_A")'),
    }),
  })
  async checkCertifications(
    input: { worker_id: string; required_cert: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Checking worker certifications', input);

    // Mock logic: Block worker W-109 for expired cert
    if (input.worker_id === 'W-109') {
      await this.mcpClients.sendSlackMessage(
        '#hr-safety',
        `⚠️ *COMPLIANCE VIOLATION ATTEMPT:* Worker W-109 attempted to accept a task requiring ${input.required_cert}. Certification expired on 2026-07-25. Task blocked.`
      );

      return {
        workerId: input.worker_id,
        certification: input.required_cert,
        isValid: false,
        status: 'EXPIRED',
        expirationDate: '2026-07-25',
        message: 'WARNING: Certification expired. Task assignment blocked. Reroute to a certified driver.'
      };
    }

    return {
      workerId: input.worker_id,
      certification: input.required_cert,
      isValid: true,
      status: 'ACTIVE',
      message: 'Worker is fully certified.'
    };
  }
}
