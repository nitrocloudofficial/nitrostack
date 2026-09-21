export const mockRiskFlags = [
  { ruleId: 'STRUCTURING', severity: 'high', evidence: '4 payments of Rs.2,40,000 against Rs.2,50,000 threshold, same payee, same day' },
  { ruleId: 'DUPLICATE_INVOICE', severity: 'medium', evidence: 'Vendor ACME-07 already received same amount within 7 days' },
  { ruleId: 'DENY_LIST', severity: 'high', evidence: 'Vendor ACME-07 matches sanctions list entry' },
];
