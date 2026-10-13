export type InventoryStatus = 'Available' | 'Low Stock' | 'Out of Stock' | 'Reserved' | 'Pending Purchase';

export type InventoryDecision = 'in_stock' | 'low_stock' | 'out_of_stock';

export type InventoryUrgency = 'Low' | 'Medium' | 'High' | 'Critical';

export interface InventoryItem {
  inventoryId: string;
  partId: string;
  partName: string;
  category: string;
  compatibleMachineType: string;
  compatibleMachineIds: string[];
  supplierId: string;
  quantityAvailable: number;
  reorderLevel: number;
  unitCostGbp: number;
  warehouseLocation: string;
  leadTimeDays: number;
  lastRestocked: string;
  inventoryStatus: InventoryStatus;
  reservedQuantity: number;
  availableQuantity: number;
  expiryDate?: string;
  lastUpdated: string;
}

export interface Reservation {
  reservationId: string;
  partId: string;
  partName: string;
  quantity: number;
  ticketId: string;
  machineId: string;
  status: 'Reserved' | 'Pending Purchase';
  createdAt: string;
}

export interface InventoryRequest {
  partId?: string;
  partName?: string;
  quantity: number;
  ticketId: string;
  machineId: string;
  urgency: InventoryUrgency;
  requestedBy?: string;
}

export interface InventoryResponse {
  decision: InventoryDecision;
  item?: InventoryItem;
  requestedQuantity: number;
  quantityOnHand: number;
  availableQuantity: number;
  warehouseLocation?: string;
  reservation?: Reservation;
  reorderRequired: boolean;
  message: string;
}
