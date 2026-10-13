import { ProcurementRepository } from "./procurement.repository.js";
import { RecommendationService } from "../pharmacy/recommendation.service.js";
import { PharmacyRecommendation } from "../pharmacy/pharmacy.recommendations.js";
import { SupplierSelection } from "./procurement.repository.js";
import {
  PrepareProcurementActionInput,
  PrepareProcurementActionOutput,
  ProcurementActionSummary,
} from "./procurement.types.js";


const PROCUREMENT_ACTION_TYPE = "CREATE_PURCHASE_ORDER";

/**
 * Orchestrates the procurement workflow: turns pharmacy recommendations
 * into approval-ready procurement actions. Business logic only — all
 * persistence goes through ProcurementRepository, all inventory
 * intelligence comes from RecommendationService. No Prisma, no SQLite,
 * no direct database access.
 */
export class ProcurementService {
  constructor(
    private readonly repository: ProcurementRepository,
    private readonly recommendationService: RecommendationService
  ) {}

  async prepareProcurementActions(
    input: PrepareProcurementActionInput
  ): Promise<PrepareProcurementActionOutput> {
    const { recommendations } = await this.recommendationService.recommendReorders({
      category: input.category,
      expiringWithinDays: input.expiringWithinDays,
      includeLowPriority: false,
    });

    const actions = await Promise.all(
        recommendations.map((recommendation) =>
            this.prepareSingleAction(recommendation)
        )
    );

    return { actions };
  }

  private async prepareSingleAction(
    recommendation: PharmacyRecommendation
  ): Promise<ProcurementActionSummary> {
    const supplier = await this.repository.findBestSupplierForItem(
      recommendation.itemId
    );

    const estimatedCostPaise = this.calculateEstimatedCost(
      supplier.unitPricePaise,
      recommendation.suggestedOrderQuantity
    );

    const approvalPolicy = await this.repository.findApprovalPolicy(
      PROCUREMENT_ACTION_TYPE,
      estimatedCostPaise
    );

    const workflowRun = await this.repository.createWorkflowRun({
      organizationId: supplier.organizationId,
      workflowType: "PROCUREMENT",
    });

    const preparedAction = await this.repository.createPreparedAction({
      workflowRunId: workflowRun.workflowRunId,
      actionType: PROCUREMENT_ACTION_TYPE,
      requesterType: "AI_AGENT",
      targetType: "CATALOG_ITEM",
      targetId: recommendation.itemId,
      amountPaise: estimatedCostPaise,
      payloadJson: this.buildPayloadJson(
        recommendation,
        supplier,
        estimatedCostPaise
      ),
      evidenceJson: this.buildEvidenceJson(recommendation),
      reasoningSummary: this.buildReasoningSummary(recommendation),
    });

    const approvalRequest = await this.repository.createApprovalRequest({
      preparedActionId: preparedAction.preparedActionId,
      approvalPolicyId: approvalPolicy.approvalPolicyId,
    });

    return {
      workflowRunId: workflowRun.workflowRunId,
      preparedActionId: preparedAction.preparedActionId,
      approvalRequestId: approvalRequest.approvalRequestId,
      approvalPolicyId: approvalPolicy.approvalPolicyId,
      itemName: recommendation.itemName,
      supplierName: supplier.supplierName,
      quantity: recommendation.suggestedOrderQuantity,
      estimatedCostPaise,
      requiredRoleCode: approvalPolicy.requiredRoleCode,
      requiredApprovals: approvalPolicy.requiredApprovals,
      status: "PENDING_APPROVAL",
    };
  }

  private calculateEstimatedCost(
    unitPricePaise: number,
    quantity: number
  ): number {
    return unitPricePaise * quantity;
  }

  private buildPayloadJson(
    recommendation: PharmacyRecommendation,
    supplier: SupplierSelection,
    estimatedCostPaise: number
  ): string {
    return JSON.stringify({
        itemId: recommendation.itemId,
        itemName: recommendation.itemName,

        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,

        quantity: recommendation.suggestedOrderQuantity,

        unitPricePaise: supplier.unitPricePaise,
        gstBasisPoints: supplier.gstBasisPoints,

        estimatedCostPaise,

    });
  }

  private buildEvidenceJson(recommendation: PharmacyRecommendation): string {
    return JSON.stringify({
      priority: recommendation.priority,
      reason: recommendation.reason,
      recommendedAction: recommendation.recommendedAction,
    });
  }

  private buildReasoningSummary(recommendation: PharmacyRecommendation): string {
    return (
      `${recommendation.reason} Procurement is required for ` +
      `${recommendation.itemName}. The selected supplier was chosen ` +
      `according to repository selection rules. This procurement workflow ` +
      `has been prepared and now awaits administrator approval before ` +
      `execution.`
    );
  }
}