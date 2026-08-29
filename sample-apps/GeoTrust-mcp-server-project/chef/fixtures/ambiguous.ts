// Fixture 3: Ambiguous business — one mismatch with a plausible explanation
// - Apex Micro Enterprises: MSME hosiery manufacturer, legitimate registry record
// - No website (common for small MSMEs — not inherently suspicious)
// - Google Business listing exists with photos and 12 reviews
// - The "ambiguity": no website + recent MSME registration, but plausibly explained
//   by being a small B2B manufacturer that sells only via trade agents
// Expected: recommendation should be 'request_evidence' NOT 'escalate'
// (different from the suspicious case which gets 'escalate')
export const AMBIGUOUS_FIXTURE = {
    caseId: 'case-004',
    businessName: 'Apex Micro Enterprises',
    registrationNumber: 'UDYAM-TN-06-0012345',
    claimedAddress: '22, Kamaraj Nagar, Tiruppur, Tamil Nadu 641604',
    incorporationYear: 2019,
    documentRef: 'APEX-REG-CERT',
    entityType: 'MSME',
    isGstRegistered: true,
    premises: 'owned',
    businessAgeMonths: 60,
    loanType: 'Secured',
};
