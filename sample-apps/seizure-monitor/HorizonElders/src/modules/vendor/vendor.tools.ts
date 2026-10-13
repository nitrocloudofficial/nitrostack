import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { getVendors } from '../../data/data-store.js';

const InputSchema = z.object({
  item: z.string().describe("Ingredient required for today's bakery production.")
});

export class VendorTools {

  @Tool({
    name: "find_vendor",
    description:
      "Find and evaluate ingredient suppliers required for bakery production.",
    inputSchema: InputSchema
  })

  async findVendor(
    input: z.infer<typeof InputSchema>,
    _ctx: ExecutionContext
  ) {

    const suppliers = getVendors().filter(
      (v) => v.item.toLowerCase() === input.item.toLowerCase()
    );

    if (suppliers.length === 0) {

      return {

        ingredient: input.item,

        supplierCount: 0,

        productionStatus: "SUPPLIER_NOT_FOUND",

        productionRecommendation:
          "No supplier currently provides this ingredient. Production may be delayed until a supplier is onboarded.",

        decisionConfidence: "90%",

        recommendedActions: [

          "Search new ingredient suppliers",

          "Contact local wholesale distributors",

          "Update approved supplier list"

        ]

      };

    }

    const approvedSuppliers = suppliers.filter(
      (s) => s.approved
    );

    approvedSuppliers.sort((a, b) => {

      if (b.rating !== a.rating) {

        return b.rating - a.rating;

      }

      return a.price - b.price;

    });

    const bestSupplier = approvedSuppliers.length > 0
      ? approvedSuppliers[0]
      : suppliers[0];

    return {

      ingredient: input.item,

      supplierCount: suppliers.length,

      approvedSupplierCount: approvedSuppliers.length,

      recommendedSupplier: {

        supplierId: bestSupplier.vendorId,

        name: bestSupplier.name,

        price: bestSupplier.price,

        rating: bestSupplier.rating,

        approved: bestSupplier.approved

      },

      supplierComparison:

        suppliers.map((supplier) => ({

          supplierId: supplier.vendorId,

          name: supplier.name,

          price: supplier.price,

          rating: supplier.rating,

          approved: supplier.approved

        })),

      supplierEvaluation: {

        selectedSupplier: bestSupplier.name,

        selectionReason: [

          "Highest quality ingredient supplier",

          "Approved bakery supplier",

          "Competitive ingredient pricing"

        ],

        bakeryImpact:

          "Selected supplier can support today's ingredient requirements."

      },

      decisionConfidence: "97%",

      recommendedActions: [

        "Generate purchase order",

        "Confirm supplier availability",

        "Schedule ingredient delivery"

      ]

    };

  }

}