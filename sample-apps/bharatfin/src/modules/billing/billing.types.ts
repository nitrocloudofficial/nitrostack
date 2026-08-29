/**
 * Billing Types
 */

export interface Invoice {
  id: string;
  customerId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issuedDate: string; // ISO 8601
  dueDate: string; // ISO 8601
  description?: string;
}

export interface ListInvoicesInput {
  customerId?: string;
  status?: Invoice['status'];
  limit?: number;
  offset?: number;
}

export interface ListInvoicesOutput {
  invoices: Invoice[];
  total: number;
  limit: number;
  offset: number;
}
