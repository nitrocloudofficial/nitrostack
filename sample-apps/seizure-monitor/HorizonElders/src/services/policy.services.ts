import policies from "../data/policies.json";

export class PolicyService {

  static getPolicies() {
    return policies;
  }

  static getApprovalThreshold() {
    return policies.procurementPolicy.approvalThreshold;
  }

  static getMinimumVendorRating() {
    return policies.procurementPolicy.minimumVendorRating;
  }

  static approvedVendorsOnly() {
    return policies.procurementPolicy.approvedVendorsOnly;
  }

  static emergencyProcurementEnabled() {
    return policies.emergencyProcurement.enabled;
  }

  static requiresApproval(totalCost: number) {
    return totalCost >= this.getApprovalThreshold();
  }

}