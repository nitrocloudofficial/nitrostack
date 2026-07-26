import {
  ToolDecorator as Tool,
  Injectable,
  ExecutionContext,
  z
} from "@nitrostack/core";
import { AuditEngine } from "./audit.engine.js";

@Injectable()
export class AuditTools {

    @Tool({

        name: "record_event",

        description: "Record enterprise audit event.",

        inputSchema: z.object({

            agentId: z.string(),

            agentName: z.string(),

            department: z.string(),

            action: z.enum([
                "DISCOVERY",
                "RISK_ANALYSIS",
                "PROMPT_SCAN",
                "RESOURCE_ACCESS",
                "POLICY_CHECK",
                "REQUEST_APPROVED",
                "REQUEST_BLOCKED",
                "AGENT_QUARANTINED",
                "LOGIN",
                "LOGOUT",
                "EXPORT_REPORT"
            ]),

            status: z.enum([
                "SUCCESS",
                "WARNING",
                "BLOCKED",
                "FAILED"
            ]),

            riskScore: z.number(),

            decision: z.string()

        })

    })

    async recordEvent(
        input: any,
        context: ExecutionContext
    ): Promise<any> {

        return AuditEngine.recordEvent({

            id: crypto.randomUUID(),

            timestamp: new Date().toISOString(),

            metadata: {},

            ...input

        });

    }

}