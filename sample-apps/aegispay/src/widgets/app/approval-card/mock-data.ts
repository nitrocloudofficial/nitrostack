export const mockInvoice = {
  id: 'INV-0018',
  vendorId: 'ACME-07',
  amount: 84000000,
  destinationAccount: '5539201847',
  invoiceDate: '2026-07-25',
  submittedAt: '2026-07-25T22:00:00Z',
  notes: 'Monthly retainer',
  status: 'pending' as const,
};

export const mockRiskFlags = [
  {
    ruleId: 'DUPLICATE_INVOICE' as const,
    severity: 'high' as const,
    evidence: 'Vendor ACME-07 already received ₹8,40,000 within 7 days',
  },
];
