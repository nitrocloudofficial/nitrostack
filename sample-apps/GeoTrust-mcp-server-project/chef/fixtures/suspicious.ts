// Fixture 2: Suspicious business — multiple independent red flags
// - Brand new domain despite 8+ years in business
// - Utility bill address different from registered address
// - No Google Business listing for a steel manufacturer
// - Outdated annual filings (18+ months overdue)
export const SUSPICIOUS_FIXTURE = {
    caseId: 'case-002',
    businessName: 'Coimbatore Steels & Alloys Pvt Ltd',
    registrationNumber: 'U27100TN2015PTC098765',
    claimedAddress: '42, Unknown Street, Chennai, Tamil Nadu 600001',
    incorporationYear: 2015,
    documentRef: 'STEEL-REG-CERT',
    entityType: 'Pvt Ltd',
    isGstRegistered: true,
    premises: 'rented',
    businessAgeMonths: 96,
    loanType: 'Unsecured',
};
