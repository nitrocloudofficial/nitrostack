import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class FactoryPrompts {
  @Prompt({
    name: 'explain_to_technician',
    description: 'Generate a prompt to explain a machine failure and troubleshooting steps in simple terms to a field technician.',
    arguments: [
      {
        name: 'machine_id',
        description: 'The ID of the machine (e.g. MCH-004)',
        required: true
      },
      {
        name: 'root_cause',
        description: 'The diagnosed root cause of the failure',
        required: true
      },
      {
        name: 'recommendations',
        description: 'Comma separated list of recommendations',
        required: true
      }
    ]
  })
  async explainToTechnician(args: any, ctx: ExecutionContext) {
    ctx.logger.info(`Prompt requested: explain_to_technician for ${args.machine_id}`);
    
    const recsList = args.recommendations.split(',').map((r: string) => `- ${r.trim()}`).join('\n');

    return [
      {
        role: 'user' as const,
        content: `Explain the failure of machine ${args.machine_id} to a technician.`
      },
      {
        role: 'assistant' as const,
        content: `🔧 **FIELD TECHNICAL ADVISORY: MCH-${args.machine_id}**
        
**Issue Diagnosed:**
${args.root_cause}

**Recommended Corrective Action Plan:**
${recsList}

**Field Guidelines:**
- Ensure lock-out/tag-out (LOTO) safety protocols are fully completed before opening any panels.
- Refer to model specifications for exact belt tension levels and bearing alignment settings.
- Log your repairs, part numbers used, and completion timestamps in the terminal after resolution.`
      }
    ];
  }

  @Prompt({
    name: 'summarize_for_manager',
    description: 'Generate a business-oriented summary of a machine failure including downtime, cost, and priority for the plant manager.',
    arguments: [
      {
        name: 'machine_id',
        description: 'The ID of the machine',
        required: true
      },
      {
        name: 'downtime_hours',
        description: 'Estimated downtime in hours',
        required: true
      },
      {
        name: 'production_loss_inr',
        description: 'Estimated financial impact in INR',
        required: true
      },
      {
        name: 'priority',
        description: 'Production priority level (low, medium, high)',
        required: true
      }
    ]
  })
  async summarizeForManager(args: any, ctx: ExecutionContext) {
    ctx.logger.info(`Prompt requested: summarize_for_manager for ${args.machine_id}`);
    
    return [
      {
        role: 'user' as const,
        content: `Summarize the operational and financial impact of the failure on machine ${args.machine_id} for the Plant Manager.`
      },
      {
        role: 'assistant' as const,
        content: `📊 **EXECUTIVE SUMMARY: MCH-${args.machine_id} FAILURE IMPACT**

Dear Manager,
We have flagged a critical event on **MCH-${args.machine_id}**. Below is the immediate risk assessment:

- **Estimated Downtime:** ${args.downtime_hours} Hours
- **Estimated Financial Impact:** ₹${parseFloat(args.production_loss_inr).toLocaleString('en-IN')} INR
- **Batch Priority:** ${args.priority.toUpperCase()}

**Operational Advice:**
Due to the **${args.priority.toUpperCase()}** priority level of the queue, we recommend redirecting pending production capacity to standby units immediately if the downtime is expected to exceed the buffer window. A maintenance work order has been created and dispatched to the field crew.`
      }
    ];
  }

  @Prompt({
    name: 'emergency_shutdown_recommendation',
    description: 'Generate a critical emergency shutdown advisory including why the action is required and safety steps.',
    arguments: [
      {
        name: 'machine_id',
        description: 'The ID of the machine',
        required: true
      },
      {
        name: 'critical_metric',
        description: 'The telemetry metric that crossed the threshold (e.g. Temperature 72.5C)',
        required: true
      }
    ]
  })
  async emergencyShutdown(args: any, ctx: ExecutionContext) {
    ctx.logger.info(`Prompt requested: emergency_shutdown_recommendation for ${args.machine_id}`);

    return [
      {
        role: 'user' as const,
        content: `Generate an Emergency Shutdown Advisory for ${args.machine_id}.`
      },
      {
        role: 'assistant' as const,
        content: `⚠️ **CRITICAL EMERGENCY SHUTDOWN ADVISORY: MCH-${args.machine_id}**

**REASON FOR ADVISORY:**
A telemetry sensor has breached the absolute maximum safety threshold.
- **Breached Metric:** ${args.critical_metric}

**IMMEDIATE COMMANDS:**
1. **POWER DOWN**: Press the physical E-Stop or trigger a soft-stop via the control PLC immediately.
2. **ISOLATE**: Perform Lock-Out Tag-Out (LOTO) on main circuit breaker panel #4.
3. **EVACUATE**: Keep all personnel clear of the drive belt housing until the drive assembly cools down completely.
4. **DISPATCH**: Notify the maintenance lead engineer immediately.`
      }
    ];
  }
}
