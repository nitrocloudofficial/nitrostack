/**
 * Sentinel Gateway — Attack Simulation Tools
 * 
 * Demo tools for staging live attacks and showing Sentinel Gateway catch them.
 */

import {
  ToolDecorator as Tool,
  ControllerDecorator as Controller,
  Widget,
  ExecutionContext,
  Injectable,
  z,
} from '@nitrostack/core';
import { AttackService } from './attack.service.js';

@Controller('sentinel')
@Injectable({ deps: [AttackService] })
export class AttackTools {
  constructor(private readonly attack: AttackService) {}

  @Tool({
    name: 'run_attack',
    description: 'Run a simulated attack scenario to demonstrate Sentinel Gateway\'s security capabilities. Scenarios: tool_poisoning (rewrites a tool description), rbac_violation (unauthorized agent call), ledger_tampering (modifies a ledger entry), description_injection (hidden instructions in tool description).',
    inputSchema: z.object({
      scenario: z.enum([
        'tool_poisoning',
        'rbac_violation',
        'ledger_tampering',
        'description_injection',
      ]).describe('Attack scenario to run'),
    }),
  })
  @Widget('attack-demo')
  async runAttack(
    input: { scenario: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.warn(`🚨 ATTACK SIMULATION: Running "${input.scenario}" scenario...`);

    let result;
    switch (input.scenario) {
      case 'tool_poisoning':
        result = await this.attack.toolPoisoning();
        break;
      case 'rbac_violation':
        result = await this.attack.rbacViolation();
        break;
      case 'ledger_tampering':
        result = await this.attack.ledgerTampering();
        break;
      case 'description_injection':
        result = await this.attack.descriptionInjection();
        break;
      default:
        return { error: `Unknown scenario: ${input.scenario}` };
    }

    return {
      ...result,
      summary: result.success
        ? `✅ Attack "${input.scenario}" was detected and blocked by ${result.detectedBy}`
        : `⚠️ Attack "${input.scenario}" was not fully caught — check setup`,
    };
  }

  @Tool({
    name: 'reset_demo',
    description: 'Reset all mock servers to their original, clean state after running attack simulations.',
    inputSchema: z.object({}),
  })
  async resetDemo(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Resetting all mock servers to clean state');
    const result = await this.attack.resetAll();
    return result;
  }

  @Tool({
    name: 'run_full_demo',
    description: 'Run the complete demo sequence: setup servers → configure policies → normal traffic → tool poisoning attack → RBAC violation. Shows the full security pipeline in action.',
    inputSchema: z.object({}),
  })
  @Widget('attack-demo')
  async runFullDemo(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('🎬 Running full demo sequence...');

    const demoSteps: Array<{ step: string; result: unknown }> = [];

    // Step 1: Normal traffic (should succeed)
    demoSteps.push({
      step: '1. Normal call: sales-bot reads CRM',
      result: await this.attack['proxy'].proxyCall('sales-bot', 'crm-server', 'get_customer', { customerId: 'cust-001' }),
    });

    demoSteps.push({
      step: '2. Normal call: data-analyst reads file',
      result: await this.attack['proxy'].proxyCall('data-analyst', 'filesystem-server', 'read_file', { path: '/config.yaml' }),
    });

    // Step 2: RBAC violation
    demoSteps.push({
      step: '3. RBAC violation: rogue-agent tries to send email',
      result: await this.attack.rbacViolation(),
    });

    // Step 3: Tool poisoning attack
    demoSteps.push({
      step: '4. Tool poisoning: send_email gets poisoned',
      result: await this.attack.toolPoisoning(),
    });

    // Step 4: Description injection
    demoSteps.push({
      step: '5. Injection detection: hidden instructions in CRM tool',
      result: await this.attack.descriptionInjection(),
    });

    return {
      demoSteps,
      summary: '🎬 Full demo complete. Check the review queue and ledger for all activity.',
    };
  }
}
