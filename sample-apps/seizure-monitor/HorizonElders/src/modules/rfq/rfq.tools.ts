import { ToolDecorator as Tool, ExecutionContext, z } from "@nitrostack/core";

const InputSchema = z.object({
  ingredient: z.string(),

  supplierId: z.string(),

  quantity: z.number().default(1),

  unitPrice: z.number().default(0)
});

let requestCounter = 0;

export class RfqTools {

  @Tool({
    name: "generate_rfq",
    description:
      "Generate an ingredient purchase request for bakery production.",
    inputSchema: InputSchema
  })

  async generateRfq(
    input: z.infer<typeof InputSchema>,
    _ctx: ExecutionContext
  ) {

    requestCounter++;

    const requestId =
      `REQ-${String(requestCounter).padStart(3, "0")}`;

    const totalCost =
      input.quantity * input.unitPrice;

    const requiresApproval =
      totalCost >= 200;

    return {

      purchaseRequest: {

        requestId,

        status: "READY_FOR_APPROVAL",

        createdAt: new Date().toISOString()

      },

      ingredientOrder: {

        ingredient: input.ingredient,

        supplierId: input.supplierId,

        quantity: input.quantity,

        unitPrice: input.unitPrice,

        estimatedCost: totalCost

      },

      bakeryProduction: {

        productionStatus:

          totalCost > 0
            ? "WAITING_FOR_INGREDIENTS"
            : "READY",

        productionImpact:

          "Ingredient purchase required before production begins."

      },

      bakeryPolicy: {

        ownerApprovalRequired: requiresApproval,

        approvalReason:

          requiresApproval

            ? "Purchase exceeds bakery approval limit."

            : "Purchase may proceed immediately."

      },

      decisionConfidence: "100%",

      recommendedActions:

        requiresApproval

          ? [

              "Send to bakery owner",

              "Await approval",

              "Place supplier order"

            ]

          : [

              "Place supplier order",

              "Schedule ingredient delivery",

              "Begin production"

            ]

    };

  }

}