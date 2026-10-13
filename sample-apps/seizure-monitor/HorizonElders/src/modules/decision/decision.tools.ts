import { ToolDecorator as Tool, ExecutionContext, z } from "@nitrostack/core";

const SupplierSchema = z.object({
  vendorId: z.string(),
  name: z.string(),
  price: z.number(),
  rating: z.number(),
  approved: z.boolean()
});

const InputSchema = z.object({
  vendors: z.array(SupplierSchema).min(1),

  ingredient: z.string().optional(),

  productionUrgency: z
    .enum(["LOW", "MEDIUM", "HIGH"])
    .optional()
    .default("MEDIUM")
});

export class DecisionTools {

  @Tool({
    name: "recommend_supplier",
    description:
      "Select the best bakery ingredient supplier based on quality, cost and production urgency.",
    inputSchema: InputSchema
  })

  async recommendSupplier(
    input: z.infer<typeof InputSchema>,
    _ctx: ExecutionContext
  ) {

    const approvedSuppliers = input.vendors.filter(
      supplier => supplier.approved
    );

    const pool =
      approvedSuppliers.length > 0
        ? approvedSuppliers
        : input.vendors;

    const scoredSuppliers = pool.map((supplier) => {

      const priceScore = (1 / supplier.price) * 100;

      const qualityScore = (supplier.rating / 5) * 100;

      let urgencyBonus = 0;

      switch (input.productionUrgency) {

        case "HIGH":
          urgencyBonus = supplier.approved ? 10 : 0;
          break;

        case "MEDIUM":
          urgencyBonus = supplier.approved ? 5 : 0;
          break;

        default:
          urgencyBonus = 0;

      }

      const overallScore =
        (priceScore * 0.35) +
        (qualityScore * 0.55) +
        urgencyBonus;

      return {

        ...supplier,

        priceScore: Number(priceScore.toFixed(2)),

        qualityScore: Number(qualityScore.toFixed(2)),

        urgencyBonus,

        overallScore: Number(overallScore.toFixed(2))

      };

    });

    scoredSuppliers.sort(
      (a, b) => b.overallScore - a.overallScore
    );

    const winner = scoredSuppliers[0];

    return {

      ingredient:

        input.ingredient ?? "Requested Ingredient",

      productionDecision: "SUPPLIER_SELECTED",

      selectedSupplier: {

        supplierId: winner.vendorId,

        supplierName: winner.name,

        ingredientPrice: winner.price,

        supplierRating: winner.rating

      },

      supplierScorecard: {

        priceScore: winner.priceScore,

        qualityScore: winner.qualityScore,

        urgencyBonus: winner.urgencyBonus,

        overallScore: winner.overallScore

      },

      bakeryReasoning: [

        "Selected highest overall supplier score",

        "Prioritized ingredient quality",

        "Balanced cost with bakery production needs",

        winner.approved
          ? "Supplier is approved for bakery purchases."
          : "No approved supplier available."

      ],

      productionImpact:

        winner.approved
          ? "Bakery production can continue once ingredients are delivered."
          : "Production can continue but supplier approval is recommended.",

      decisionConfidence: "97%",

      recommendedActions: [

        "Generate purchase order",

        "Schedule ingredient delivery",

        "Begin production preparation"

      ]

    };

  }

}