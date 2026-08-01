export enum PurchaseUrgency {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

export enum SupplierStatus {
  Preferred = 'Preferred',
  Active = 'Active',
  Inactive = 'Inactive',
}

export enum ApprovalStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export enum PurchaseStatus {
  Requested = 'Requested',
  Ordered = 'Ordered',
  Cancelled = 'Cancelled',
}

export interface Supplier {
  supplierId: string;
  supplierName: string;
  supplierCategory: string;
  contactPerson: string;
  email: string;
  phoneNumber: string;
  city: string;
  country: string;
  suppliedParts: string[];
  averageLeadTimeDays: number;
  minimumOrderQuantity: number;
  supplierRating: number;
  onTimeDeliveryRate: number;
  paymentTerms: string;
  supplierStatus: SupplierStatus;
  lastOrderDate: string;
}

export interface SupplierScore {
  supplier: Supplier;
  rank: number;
  score: number;
  priceScore: number;
  deliveryScore: number;
  reliabilityScore: number;
  statusScore: number;
  estimatedUnitCostGbp: number;
  recommendedQuantity: number;
  estimatedTotalCostGbp: number;
  expectedDeliveryDate: string;
  rationale: string;
}

export interface PurchaseAgentRequest {
  partId?: string;
  partName: string;
  inventoryId?: string;
  requestedQuantity: number;
  urgency: PurchaseUrgency;
  requestReason: string;
  unitCostGbp?: number;
  ticketId?: string;
  machineId?: string;
  fulfillmentContext?: 'repair_blocking' | 'stock_replenishment';
}

export interface PurchaseRequestRecord {
  purchaseRequestId: string;
  requestDate: string;
  inventoryId: string;
  partId: string;
  partName: string;
  supplierId: string;
  supplierName: string;
  requestedQuantity: number;
  unitCostGbp: number;
  totalCostGbp: number;
  urgencyLevel: PurchaseUrgency;
  requestReason: string;
  expectedDeliveryDate: string;
  approvalStatus: ApprovalStatus;
  purchaseStatus: PurchaseStatus;
  requestedBy: string;
  approvedBy: string;
}

export interface PurchaseRecommendation {
  purchaseRequest: PurchaseRequestRecord;
  rankedSuppliers: SupplierScore[];
  selectedSupplier: SupplierScore;
  message: string;
}
