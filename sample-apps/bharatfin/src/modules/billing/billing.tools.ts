import { ToolDecorator as Tool, z, ExecutionContext, Injectable } from '@nitrostack/core';
import type { Invoice, ListInvoicesInput, ListInvoicesOutput } from './billing.types.js';

/**
 * Billing Tools
 * 
 * Tools for managing invoices and billing operations.
 */
@Injectable()
export class BillingTools {
  /**
   * Mock invoice database
   */
  private mockInvoices: Invoice[] = [
    {
      id: 'inv_001',
      customerId: 'cust_001',
      amount: 1500.00,
      currency: 'USD',
      status: 'paid',
      issuedDate: '2026-07-01T00:00:00Z',
      dueDate: '2026-08-01T00:00:00Z',
      description: 'Monthly subscription',
    },
    {
      id: 'inv_002',
      customerId: 'cust_001',
      amount: 2500.00,
      currency: 'USD',
      status: 'sent',
      issuedDate: '2026-08-01T00:00:00Z',
      dueDate: '2026-09-01T00:00:00Z',
      description: 'Professional services',
    },
    {
      id: 'inv_003',
      customerId: 'cust_002',
      amount: 800.00,
      currency: 'USD',
      status: 'overdue',
      issuedDate: '2026-06-01T00:00:00Z',
      dueDate: '2026-07-01T00:00:00Z',
      description: 'Consulting hours',
    },
    {
      id: 'inv_004',
      customerId: 'cust_002',
      amount: 3200.00,
      currency: 'USD',
      status: 'draft',
      issuedDate: '2026-08-15T00:00:00Z',
      dueDate: '2026-09-15T00:00:00Z',
      description: 'Q3 services',
    },
  ];

  @Tool({
    name: 'listInvoices',
    description: 'List invoices with optional filtering by customer ID and status. Supports pagination via limit and offset.',
    inputSchema: z.object({
      customerId: z.string().optional().describe('Filter by customer ID'),
      status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional().describe('Filter by invoice status'),
      limit: z.number().int().min(1).max(100).optional().default(10).describe('Number of invoices to return (max 100)'),
      offset: z.number().int().min(0).optional().default(0).describe('Number of invoices to skip for pagination'),
    }),
  })
  async listInvoices(
    input: ListInvoicesInput,
    context: ExecutionContext,
  ): Promise<ListInvoicesOutput> {
    const { customerId, status, limit = 10, offset = 0 } = input;

    // Filter invoices
    let filtered = this.mockInvoices;

    if (customerId) {
      filtered = filtered.filter((inv) => inv.customerId === customerId);
    }

    if (status) {
      filtered = filtered.filter((inv) => inv.status === status);
    }

    const total = filtered.length;

    // Apply pagination
    const paginated = filtered.slice(offset, offset + limit);

    context.logger.info(`listInvoices called`, {
      customerId,
      status,
      limit,
      offset,
      totalResults: total,
      returnedCount: paginated.length,
    });

    return {
      invoices: paginated,
      total,
      limit,
      offset,
    };
  }
}
