// ═══════════════════════════════════════════════════════════════════════════════
// APPLICANT DOCUMENTS — Mock data representing what applicants submit
// This is SEPARATE from the Registry (ground truth). These two sources are
// ALLOWED to disagree — that's the whole point of verification.
// ═══════════════════════════════════════════════════════════════════════════════

export interface MockDocument {
    /** Reference key for this document bundle */
    refKey: string;
    /** Business name as written on the document */
    businessName: string;
    /** Registration/CIN number as written on the document */
    registrationNumber: string;
    /** Address as written on the document */
    address: string;
    /** Incorporation date as written on the document */
    incorporationDate: string;
    /** Director name as written on the document */
    directorName: string;
    /** Simulated OCR confidence (0-1) */
    documentQuality: number;
    /** PAN as written on the PAN card */
    pan?: string;
    /** GSTIN as written on the GST certificate */
    gstNumber?: string;
    /** Udyam number as written on the MSME certificate */
    udyamNumber?: string;
    /** Trade license number */
    tradeLicenseNumber?: string;
    /** Ownership type from property documents */
    ownershipType?: 'owned' | 'rented';
    /** GPS coordinates embedded in premises photo EXIF */
    photoLocation?: { lat: number; lng: number };
    /** Utility bill address (may differ from registration address!) */
    utilityBillAddress?: string;
    /** Bank account holder name */
    bankAccountName?: string;
    /** Bank account number */
    bankAccountNumber?: string;
    /** IFSC code */
    ifscCode?: string;
    /** Monthly transaction count (from bank statement) */
    monthlyTransactions?: number;
    /** Average monthly balance (INR) */
    avgMonthlyBalance?: number;
    /** Last transaction date */
    lastTransactionDate?: string;
    /** Annual turnover from ITR (INR) */
    annualTurnover?: number;
    /** ITR filing year */
    itrFilingYear?: string;
    /** Entity type as claimed */
    entityType?: string;
}

/**
 * APPLICANT-SUBMITTED DOCUMENTS
 * These represent what the applicant uploads. Some data deliberately
 * DISAGREES with the Registry to test contradiction detection.
 */
export const APPLICANT_DOCUMENTS: Record<string, MockDocument> = {
    // ─── Case 1: Genuine (should pass) ───────────────────────────────────
    'KAV-REG-CERT': {
        refKey: 'KAV-REG-CERT',
        businessName: 'Kaveri AgriTech Pvt Ltd',
        registrationNumber: 'U01111KA2020PTC334455',
        address: '10, Farm Road, Mysuru, Karnataka 570001',
        incorporationDate: '2020-04-10',
        directorName: 'Suresh Patel',
        documentQuality: 0.98,
        pan: 'AACCK3344F',
        gstNumber: '29AACCK3344F1Z8',
        tradeLicenseNumber: 'TL/MYS/2020/0012',
        ownershipType: 'owned',
        photoLocation: { lat: 12.2958, lng: 76.6394 },
        utilityBillAddress: '10, Farm Road, Mysuru, Karnataka 570001',
        bankAccountName: 'Kaveri AgriTech Pvt Ltd',
        bankAccountNumber: '3456789012345678',
        ifscCode: 'SBIN0003456',
        monthlyTransactions: 55,
        avgMonthlyBalance: 1200000,
        lastTransactionDate: '2024-01-20',
        annualTurnover: 15000000,
        itrFilingYear: '2023-24',
        entityType: 'Pvt Ltd',
    },

    // ─── Case 2: Fraud Shell (should escalate) ───────────────────────────
    'NEX-REG-CERT': {
        refKey: 'NEX-REG-CERT',
        businessName: 'Nexus Global Trading LLC', // LLC vs LLP mismatch
        registrationNumber: 'U51909MH2022LLP123456', // Does not match registry
        address: '99, Marine Drive, Mumbai, Maharashtra 400020',
        incorporationDate: '2022-08-15',
        directorName: 'Amit Singh',
        documentQuality: 0.85,
        pan: 'INVALID889', // Invalid PAN format
        gstNumber: '27AAACN1234E1Z4',
        tradeLicenseNumber: 'TL/MUM/2022/998',
        ownershipType: 'rented',
        photoLocation: { lat: 18.5204, lng: 73.8567 }, // Location in Pune, far from claimed Mumbai address
        utilityBillAddress: '15, Fake Street, Pune, Maharashtra 411001', // Mismatch
        bankAccountName: 'Nexus Traders', // Mismatch
        bankAccountNumber: '9988776655443322',
        ifscCode: 'ICIC0009988',
        monthlyTransactions: 2, // Low activity
        avgMonthlyBalance: 5000, // Very low balance
        lastTransactionDate: '2023-01-10', // Stale
        annualTurnover: 250000,
        itrFilingYear: '2021-22', // Old ITR
        entityType: 'LLC',
    },

    // ─── Case 3: Ambiguous (needs evidence) ──────────────────────────────
    'BAL-REG-CERT': {
        refKey: 'BAL-REG-CERT',
        businessName: 'Balaji Hardware Store',
        registrationNumber: 'UDYAM-TN-02-9876543',
        address: '15, Market Street, Madurai, Tamil Nadu 625001',
        incorporationDate: '2012-05-20',
        directorName: 'Rajan Kumar',
        documentQuality: 0.72,
        pan: 'AAPB1111C', // Missing one char (9 chars instead of 10)
        udyamNumber: 'UDYAM-TN-02-9876543',
        gstNumber: '33AAGPB1111C1Z7',
        tradeLicenseNumber: 'TL/MAD/2012/111',
        ownershipType: 'rented',
        photoLocation: { lat: 9.9252, lng: 78.1198 },
        utilityBillAddress: '15, Market Street, Madurai, Tamil Nadu 625001', // Match
        bankAccountName: 'Balaji Hardware Store',
        bankAccountNumber: '1122334455667788',
        ifscCode: 'HDFC0001122',
        monthlyTransactions: 120, // High activity, typical for retail
        avgMonthlyBalance: 350000,
        lastTransactionDate: '2024-01-22',
        annualTurnover: 4000000,
        itrFilingYear: '2023-24',
        entityType: 'Proprietorship',
    }
};
