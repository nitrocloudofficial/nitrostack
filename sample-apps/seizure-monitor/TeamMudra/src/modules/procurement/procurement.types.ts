    import { z } from "@nitrostack/core";

    /**
     * ---------------------------------------------------------------------------
     * MCP tool input schema
     * ---------------------------------------------------------------------------
     * Deliberately has no item/supplier IDs. The agent asks for procurement
     * actions in terms a human administrator would use ("prepare procurement
     * actions for antibiotics"); ProcurementService is responsible for deriving
     * which items need action (via RecommendationService), which supplier to
     * use, and which approval policy applies. Making the LLM supply raw
     * database IDs would push data-layer knowledge into the agent, which is
     * exactly what the Repository -> Service -> Tool architecture exists to
     * avoid.
     */
    export const PrepareProcurementActionInputSchema = z.object({
    category: z.string().optional().describe(
        "Optional category filter (e.g. 'antibiotics'). If omitted, procurement " +
        "actions are prepared across all categories."
    ),
    expiringWithinDays: z
        .number()
        .int()
        .positive()
        .optional()
        .default(30)
        .describe(
        "Threshold, in days, used to flag items as expiring soon when " +
            "deriving which items need a procurement action."
        ),
    });

    export type PrepareProcurementActionInput = z.infer<
    typeof PrepareProcurementActionInputSchema
    >;

    /**
     * ---------------------------------------------------------------------------
     * Domain output
     * ---------------------------------------------------------------------------
     * A ProcurementActionSummary is a human-readable, agent-facing view of one
     * prepared (not yet executed) procurement action. It always represents work
     * that is awaiting administrator approval, never a completed purchase.
     */
    export type ProcurementActionStatus =
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "EXECUTED";


    export interface ProcurementActionSummary {
    workflowRunId: string;
    preparedActionId: string;
    approvalRequestId: string;
    approvalPolicyId: string;

    itemName: string;
    supplierName: string;
    quantity: number;
    estimatedCostPaise: number;

    requiredRoleCode: string;
    requiredApprovals: number;

    status: ProcurementActionStatus;

    }

    export interface PrepareProcurementActionOutput {
    actions: ProcurementActionSummary[];
    }