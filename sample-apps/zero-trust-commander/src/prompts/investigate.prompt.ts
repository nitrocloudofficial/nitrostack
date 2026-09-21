import { ControllerDecorator as Controller, PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';
import { randomUUID } from 'crypto';

@Controller()
export class WorkflowPrompts {

    // ─── 1. Incident Investigation ─────────────────────────────────────────
    @Prompt({
        name: 'investigate_incident',
        description: 'Guided Zero-Trust workflow for investigating and remediating production incidents.',
        arguments: [
            { name: 'service_name', description: 'The name of the service experiencing the issue (e.g., payment_gateway)', required: true }
        ]
    })
    async getInvestigationPrompt(args: { service_name: string }, ctx: ExecutionContext) {
        const incidentId = `INC-${randomUUID().split('-')[0].toUpperCase()}`;
        ctx.logger.info(`[${incidentId}] Prompting investigation workflow for ${args.service_name}`);
        return [{
            role: 'user',
            content: `A critical incident has been opened: **${incidentId}** for service **"${args.service_name}"**.

Please use the Zero-Trust-Commander MCP tools to investigate and remediate by following these steps:

1. **Read Infrastructure State**: First, read the \`infrastructure://current-state\` resource to understand the full topology, which services depend on \`${args.service_name}\`, and its current blast radius.
2. **Test Zod Validation**: Try calling \`fetch_recent_errors\` with an invalid name like \`@${args.service_name}!\`. Note the schema rejection.
3. **Fetch Real Logs**: Call \`fetch_recent_errors\` for \`${args.service_name}\`. Examine the crash trace.
4. **Trace the Commit**: Use \`diff_recent_commits\` on \`broken-app.js\` searching for \`query\` to find the offending commit.
5. **Trigger Zero-Trust Gate**: Call \`execute_rollback\` with:
   - service_name: \`${args.service_name}\`
   - incident_id: \`${incidentId}\`
   - reason: (your detailed explanation based on findings above)
6. **Wait for human authorization.** The dashboard will show **${incidentId}**. Do NOT retry until the human approves.`
        }];
    }

    // ─── 2. System Health Check ────────────────────────────────────────────
    @Prompt({
        name: 'system_health_check',
        description: 'Comprehensive health sweep across all registered services. Checks uptime, memory, CPU, error rates, and blast radius of any degraded services.',
        arguments: [
            { name: 'environment', description: 'The environment to check (e.g., production, staging)', required: true }
        ]
    })
    async getHealthCheckPrompt(args: { environment: string }, ctx: ExecutionContext) {
        const checkId = `CHK-${randomUUID().split('-')[0].toUpperCase()}`;
        ctx.logger.info(`[${checkId}] Health check for ${args.environment}`);
        return [{
            role: 'user',
            content: `Please perform a comprehensive system health check (ID: **${checkId}**) on the **${args.environment}** environment.

1. **Read Infrastructure State**: Read the \`infrastructure://current-state\` resource. It includes blast radius analysis for every service — pay special attention to the \`highest_impact_service\` field.
2. **Deep-dive degraded services**: For each service with status != "healthy", call \`fetch_recent_errors\` to get their crash logs.
3. **Evaluate Thresholds**: For each service, check:
   - Is memory_mb above the safe threshold?
   - Is cpu_pct > 80%?
   - Is error_rate_pct > 5%?
   - What is its blast_radius? How many services would be impacted if it went down?
4. **Produce a Health Report** with traffic-light status (🟢 / 🟡 / 🔴) for each service and their blast radius impact.
5. **Recommend Actions**: For any 🔴 Critical service, recommend a specific action (rollback/restart/scale). Do NOT execute — human approval required.`
        }];
    }

    // ─── 3. Threat Response ────────────────────────────────────────────────
    @Prompt({
        name: 'threat_response',
        description: 'Automated threat response workflow: detects anomalous access, quarantines affected pods and alerts the security team.',
        arguments: [
            { name: 'pod_name', description: 'Name of the suspected compromised pod (e.g., api-server-7f9c)', required: true },
            { name: 'threat_level', description: 'Severity: low, medium, or critical', required: true }
        ]
    })
    async getThreatResponsePrompt(args: { pod_name: string; threat_level: string }, ctx: ExecutionContext) {
        const threatId = `THR-${randomUUID().split('-')[0].toUpperCase()}`;
        ctx.logger.info(`[${threatId}] Threat response for pod ${args.pod_name}`);
        return [{
            role: 'user',
            content: `A security threat has been detected — Threat ID: **${threatId}**. Pod: **${args.pod_name}**, Level: **${args.threat_level}**.

Execute the Zero-Trust threat response protocol:

1. **Read Infrastructure Topology**: Read \`infrastructure://current-state\` to identify which services ${args.pod_name} belongs to and compute its blast radius.
2. **Scan Access Logs**: Call \`fetch_recent_errors\` for the affected service to identify anomalous activity.
3. **Assess by threat level**:
   - **low**: Document and monitor.
   - **medium**: Recommend isolation, notify team.
   - **critical**: Call \`execute_rollback\` with incident_id \`${threatId}\` and await human authorization.
4. **If critical**: Pause and display threat ID **${threatId}** in the authorization dashboard.
5. All actions must be logged for compliance.`
        }];
    }

    // ─── 4. Safe Deploy ────────────────────────────────────────────────────
    @Prompt({
        name: 'safe_deploy',
        description: 'Guarded canary deployment with automated monitoring and a human sign-off gate before full rollout.',
        arguments: [
            { name: 'service_name', description: 'Service to deploy (e.g., checkout_api)', required: true },
            { name: 'image_tag', description: 'Docker image tag (e.g., v2.3.1)', required: true }
        ]
    })
    async getSafeDeployPrompt(args: { service_name: string; image_tag: string }, ctx: ExecutionContext) {
        const deployId = `DEP-${randomUUID().split('-')[0].toUpperCase()}`;
        ctx.logger.info(`[${deployId}] Safe deploy ${args.service_name}:${args.image_tag}`);
        return [{
            role: 'user',
            content: `Initiating guarded canary deployment — Deploy ID: **${deployId}**. Service: **${args.service_name}**, Image: **${args.image_tag}**.

1. **Pre-deploy Baseline**: Read \`infrastructure://current-state\` to get the current baseline error rate and blast radius for ${args.service_name}.
2. **Fetch Pre-deploy Logs**: Call \`fetch_recent_errors\` for ${args.service_name} to establish current error baseline.
3. **Simulate Canary**: Describe a 5% traffic canary of ${args.image_tag}, which pods would be affected, and expected blast radius if deployment fails.
4. **Monitor Phase**: Call \`fetch_recent_errors\` again to compare. If error rate increased >2%, flag deployment FAILED and recommend rollback.
5. **Gate for Full Rollout**: If canary is STABLE, call \`execute_rollback\` in "pending" state with:
   - incident_id: \`${deployId}\`
   - reason: "Full rollout authorization request for canary ${args.image_tag} on ${args.service_name}"
6. **Wait for human sign-off.** Deploy ID **${deployId}** must appear in the authorization dashboard.`
        }];
    }
}
