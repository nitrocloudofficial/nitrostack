import { ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import { CaseStoreService } from '../case-store/case-store.service.js';
import type { ToolResult, Claim, Evidence } from '../../shared-types.js';

// Mock document library — simulates OCR/extraction results from uploaded files
const MOCK_DOCUMENTS: Record<string, {
    name: string;
    registrationNumber: string;
    address: string;
    incorporationDate: string;
    directorName: string;
    documentQuality: number; // 0-1
    pan?: string;
    gstNumber?: string;
    udyamNumber?: string;
    tradeLicenseNumber?: string;
    ownershipType?: 'owned' | 'rented';
    photoLocation?: { lat: number; lng: number };
}> = {
    'REG-CERT': {
        name: 'Priya Textiles Pvt Ltd',
        registrationNumber: 'U17111KA2018PTC112345',
        address: '42, MG Road, Bengaluru, Karnataka 560001',
        incorporationDate: '2018-03-15',
        directorName: 'Priya Venkataraman',
        documentQuality: 0.97,
        pan: 'ABCDE1234F',
        gstNumber: '29AAAPP1234F1Z5',
        tradeLicenseNumber: 'TL/BLR/2018/4521',
        ownershipType: 'owned',
        photoLocation: { lat: 12.9715, lng: 77.5945 }, // Close to MG Road
    },
    'doc_vibrant_reg_2023.pdf': {
        name: 'Vibrant Logistics Pvt Ltd',
        registrationNumber: 'U63090MH2019PTC567890',
        address: 'Andheri East, Mumbai, Maharashtra',
        incorporationDate: '2019-08-12',
        directorName: 'Ramesh Patel',
        documentQuality: 0.95,
        pan: 'ABCDE5678F',
        gstNumber: '27AADCV1234E1Z2',
        tradeLicenseNumber: 'TL/MUM/2019/1234',
        ownershipType: 'rented',
        photoLocation: { lat: 19.1136, lng: 72.8697 }, // Andheri East
    },
    'STEEL-REG-CERT': {
        name: 'Coimbatore Steels & Alloys Pvt Ltd',
        registrationNumber: 'U27100TN2015PTC098765',
        address: '15, SIDCO Industrial Estate, Coimbatore, Tamil Nadu 641021',
        incorporationDate: '2015-07-20',
        directorName: 'Rajesh Murugesan',
        documentQuality: 0.91,
        pan: 'INVALID123',
        gstNumber: '33AAACP9876A1Z1',
        tradeLicenseNumber: 'TL/CBE/2015/098',
        ownershipType: 'rented',
        photoLocation: { lat: 11.0100, lng: 76.9500 }, // Mismatch location slightly
    },
    'DIGITAL-REG-CERT': {
        name: 'Namma Digital Solutions LLP',
        registrationNumber: 'AAH-2345',
        address: '78, 5th Block, Koramangala, Bengaluru, Karnataka 560095',
        incorporationDate: '2021-11-01',
        directorName: 'Arun Kumar Pillai',
        documentQuality: 0.43,
        pan: 'MNBVC3456K',
        ownershipType: 'rented',
    },
    'APEX-REG-CERT': {
        name: 'Apex Micro Enterprises',
        registrationNumber: 'UDYAM-TN-06-0012345',
        address: '22, Kamaraj Nagar, Tiruppur, Tamil Nadu 641604',
        incorporationDate: '2019-05-10',
        directorName: 'Senthil Krishnamurthy',
        documentQuality: 0.88,
        pan: 'PLMKO6789J',
        udyamNumber: 'UDYAM-TN-06-0012345',
        gstNumber: '33AAGPA5678B1Z9',
        tradeLicenseNumber: 'TL/TPR/2019/332',
        ownershipType: 'owned',
        photoLocation: { lat: 11.1085, lng: 77.3411 }, // Matches Kamaraj Nagar
    },
    'VENKATESWARA-REG-CERT': {
        name: 'Sri Venkateswara Exports',
        registrationNumber: 'IEC-0316054321',
        address: '9, Beach Road, Visakhapatnam, Andhra Pradesh 530001',
        incorporationDate: '2016-09-22',
        directorName: 'Hari Prasad Rao',
        documentQuality: 0.82,
        pan: 'QWERT1122P',
        gstNumber: '37AATHR7654C1Z3',
        ownershipType: 'owned',
    },
};

const DocumentReaderSchema = z.object({
    caseId: z.string().describe('Unique case identifier'),
    businessName: z.string().describe('Business name to investigate'),
    documentType: z.enum(['registration_certificate', 'identity_document', 'utility_bill']).describe('Type of document to extract from'),
    documentRef: z.string().optional().describe('Reference key for the mock document (e.g. REG-CERT)'),
});

@Injectable({ deps: [CaseStoreService] })
export class DocumentsTools {
    constructor(private readonly caseStore: CaseStoreService) { }

    @Tool({
        name: 'extractRegistrationCertificate',
        description: 'Identity Sub-agent: Extract structured claims (business name, registration number, address, incorporation date, director) from a registration certificate.',
        inputSchema: DocumentReaderSchema,
        examples: {
            request: {
                caseId: 'case-001',
                businessName: 'Priya Textiles Pvt Ltd',
                documentType: 'registration_certificate',
                documentRef: 'REG-CERT',
            },
            response: {
                status: 'success',
                ok: true,
                source: 'Document OCR — Registration Certificate',
                confidence: 0.97,
                matchesClaim: true,
                retrievedAt: '2024-01-15T10:30:00Z',
                data: {
                    extractedClaims: [
                        { dimension: 'identity', label: 'Business Name', value: 'Priya Textiles Pvt Ltd', status: 'pending' },
                        { dimension: 'identity', label: 'Registration Number', value: 'U17111KA2018PTC112345', status: 'pending' },
                        { dimension: 'location', label: 'Registered Address', value: '42, MG Road, Bengaluru, Karnataka 560001', status: 'pending' },
                    ],
                    documentQuality: 0.97,
                    documentType: 'registration_certificate',
                }
            }
        }
    })
    async extractRegistrationCertificate(args: z.infer<typeof DocumentReaderSchema>) {
        const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
        const now = new Date().toISOString();

        // Look up mock document — fall back to a generic result if no ref
        const docKey = args.documentRef ?? Object.keys(MOCK_DOCUMENTS).find(k =>
            MOCK_DOCUMENTS[k].name.toLowerCase().includes(args.businessName.toLowerCase().split(' ')[0])
        ) ?? 'REG-CERT';

        const doc = MOCK_DOCUMENTS[docKey];
        const quality = doc?.documentQuality ?? 0.6;

        let sourceLabel = 'Document OCR — Registration Certificate';
        let extractedClaims: Partial<Claim>[] = [
            {
                id: `${args.caseId}-doc-name`,
                dimension: 'identity',
                label: 'Business Name',
                value: doc?.name ?? 'Not legible',
                status: 'pending',
                evidence: [{
                    id: `ev-doc-name-${Date.now()}`,
                    source: sourceLabel,
                    snippet: `Name extracted from registration certificate: "${doc?.name}"`,
                    retrievedAt: now,
                    reliability: quality,
                    relation: 'supports',
                }],
            },
            {
                id: `${args.caseId}-doc-regnum`,
                dimension: 'identity',
                label: 'Registration Number',
                value: doc?.registrationNumber ?? 'Not legible',
                status: 'pending',
                evidence: [{
                    id: `ev-doc-regnum-${Date.now()}`,
                    source: sourceLabel,
                    snippet: `Registration number: ${doc?.registrationNumber}`,
                    retrievedAt: now,
                    reliability: quality,
                    relation: 'supports',
                }],
            },
            {
                id: `${args.caseId}-doc-address`,
                dimension: 'location',
                label: 'Registered Address',
                value: doc?.address ?? 'Not legible',
                status: 'pending',
                evidence: [{
                    id: `ev-doc-addr-${Date.now()}`,
                    source: sourceLabel,
                    snippet: `Address on certificate: "${doc?.address}"`,
                    retrievedAt: now,
                    reliability: quality,
                    relation: 'supports',
                }],
            },
            {
                id: `${args.caseId}-doc-director`,
                dimension: 'identity',
                label: 'Director Name',
                value: doc?.directorName ?? 'Not legible',
                status: 'pending',
                evidence: [{
                    id: `ev-doc-dir-${Date.now()}`,
                    source: sourceLabel,
                    snippet: `Director: ${doc?.directorName}`,
                    retrievedAt: now,
                    reliability: quality,
                    relation: 'supports',
                }],
            },
        ];

        const result: ToolResult<{
            extractedClaims: Partial<Claim>[];
            documentQuality: number;
            documentType: string;
        }> = {
            status: 'success',
            ok: true,
            source: sourceLabel,
            data: {
                extractedClaims,
                documentQuality: quality,
                documentType: 'registration_certificate',
            },
            confidence: quality,
            retrievedAt: now,
        };

        this.caseStore.addToolResult(args.caseId, result as ToolResult);

        const existing = state.claims;
        const merged = [...existing];
        for (const ec of extractedClaims) {
            const idx = merged.findIndex(c => c.id === ec.id);
            if (idx === -1) merged.push(ec as Claim);
            else merged[idx] = { ...merged[idx], ...ec };
        }
        this.caseStore.updateClaims(args.caseId, merged);

        return result;
    }

    @Tool({
        name: 'extractUtilityBill',
        description: 'Location Sub-agent: Extract structured claims (utility bill address) from a utility bill document.',
        inputSchema: DocumentReaderSchema,
    })
    async extractUtilityBill(args: z.infer<typeof DocumentReaderSchema>) {
        const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
        const now = new Date().toISOString();
        const docKey = args.documentRef ?? Object.keys(MOCK_DOCUMENTS).find(k =>
            MOCK_DOCUMENTS[k].name.toLowerCase().includes(args.businessName.toLowerCase().split(' ')[0])
        ) ?? 'REG-CERT';
        const doc = MOCK_DOCUMENTS[docKey];
        const quality = doc?.documentQuality ?? 0.6;
        
        let sourceLabel = 'Document OCR — Utility Bill';
        const utilityAddress = docKey === 'STEEL-REG-CERT'
            ? '8, Anna Nagar, Coimbatore, Tamil Nadu 641002' 
            : doc?.address ?? 'Address not legible';
            
        let extractedClaims: Partial<Claim>[] = [{
            id: `${args.caseId}-util-address`,
            dimension: 'location',
            label: 'Utility Bill Address',
            value: utilityAddress,
            status: 'pending',
            evidence: [{
                id: `ev-util-addr-${Date.now()}`,
                source: sourceLabel,
                snippet: `Address on utility bill: "${utilityAddress}"`,
                retrievedAt: now,
                reliability: quality * 0.9,
                relation: 'supports',
            }],
        }];

        const result: ToolResult<{
            extractedClaims: Partial<Claim>[];
            documentQuality: number;
            documentType: string;
        }> = {
            status: 'success',
            ok: true,
            source: sourceLabel,
            data: {
                extractedClaims,
                documentQuality: quality,
                documentType: 'utility_bill',
            },
            confidence: quality * 0.9,
            retrievedAt: now,
        };

        this.caseStore.addToolResult(args.caseId, result as ToolResult);

        const existing = state.claims;
        const merged = [...existing];
        for (const ec of extractedClaims) {
            const idx = merged.findIndex(c => c.id === ec.id);
            if (idx === -1) merged.push(ec as Claim);
            else merged[idx] = { ...merged[idx], ...ec };
        }
        this.caseStore.updateClaims(args.caseId, merged);

        return result;
    }

    @Tool({
        name: 'extractIdentityDocument',
        description: 'Identity Sub-agent: Extract director name from an identity document (PAN/Aadhaar).',
        inputSchema: DocumentReaderSchema,
    })
    async extractIdentityDocument(args: z.infer<typeof DocumentReaderSchema>) {
        const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
        const now = new Date().toISOString();
        const docKey = args.documentRef ?? Object.keys(MOCK_DOCUMENTS).find(k =>
            MOCK_DOCUMENTS[k].name.toLowerCase().includes(args.businessName.toLowerCase().split(' ')[0])
        ) ?? 'REG-CERT';
        const doc = MOCK_DOCUMENTS[docKey];
        const quality = doc?.documentQuality ?? 0.6;
        
        let sourceLabel = 'Document OCR — Identity Document';
        let extractedClaims: Partial<Claim>[] = [{
            id: `${args.caseId}-id-director`,
            dimension: 'identity',
            label: 'Director Name (ID)',
            value: doc?.directorName ?? 'Not legible',
            status: 'pending',
            evidence: [{
                id: `ev-id-${Date.now()}`,
                source: sourceLabel,
                snippet: `Director name from Aadhaar/PAN: ${doc?.directorName ?? 'Not legible'}`,
                retrievedAt: now,
                reliability: quality,
                relation: 'supports',
            }],
        }];

        const result: ToolResult<{
            extractedClaims: Partial<Claim>[];
            documentQuality: number;
            documentType: string;
        }> = {
            status: 'success',
            ok: true,
            source: sourceLabel,
            data: {
                extractedClaims,
                documentQuality: quality,
                documentType: 'identity_document',
            },
            confidence: quality,
            retrievedAt: now,
        };

        this.caseStore.addToolResult(args.caseId, result as ToolResult);

        const existing = state.claims;
        const merged = [...existing];
        for (const ec of extractedClaims) {
            const idx = merged.findIndex(c => c.id === ec.id);
            if (idx === -1) merged.push(ec as Claim);
            else merged[idx] = { ...merged[idx], ...ec };
        }
        this.caseStore.updateClaims(args.caseId, merged);

        return result;
    }

    // New specific tools based on the SME verification priority
    
    @Tool({
        name: 'extractPAN',
        description: 'Extract and validate PAN card format (regex) from the provided document.',
        inputSchema: z.object({
            caseId: z.string(),
            businessName: z.string(),
            documentRef: z.string().optional(),
        }),
    })
    async extractPAN(args: { caseId: string; businessName: string; documentRef?: string }) {
        const docKey = args.documentRef ?? 'REG-CERT';
        const doc = MOCK_DOCUMENTS[docKey];
        const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
        const pan = doc?.pan ?? 'UNKNOWN';
        const quality = doc?.documentQuality ?? 0.6;
        
        const isValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
        
        const evidence: Evidence = {
            id: `ev-pan-${Date.now()}`,
            source: 'PAN Extractor',
            snippet: `Extracted PAN: ${pan} (Format valid: ${isValid})`,
            retrievedAt: new Date().toISOString(),
            reliability: quality,
            relation: isValid ? 'supports' : 'contradicts',
        };
        
        const claim: Claim = {
            id: `${args.caseId}-pan`,
            dimension: 'identity',
            label: 'PAN',
            value: pan,
            status: isValid ? 'verified' : 'contradicted',
            evidence: [evidence]
        };
        
        const existing = state.claims;
        const idx = existing.findIndex(c => c.id === claim.id);
        if (idx === -1) existing.push(claim);
        else existing[idx] = { ...existing[idx], ...claim };
        
        this.caseStore.updateClaims(args.caseId, existing);
        return { ok: true, data: { pan, isValid } };
    }

    @Tool({
        name: 'extractUdyamCertificate',
        description: 'Extract Udyam/MSME Certificate details.',
        inputSchema: z.object({
            caseId: z.string(),
            businessName: z.string(),
            documentRef: z.string().optional(),
        }),
    })
    async extractUdyamCertificate(args: { caseId: string; businessName: string; documentRef?: string }) {
        const docKey = args.documentRef ?? 'REG-CERT';
        const doc = MOCK_DOCUMENTS[docKey];
        const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
        const udyam = doc?.udyamNumber ?? doc?.registrationNumber ?? 'UNKNOWN';
        
        const evidence: Evidence = {
            id: `ev-udyam-${Date.now()}`,
            source: 'Udyam Extractor',
            snippet: `Extracted Udyam Number: ${udyam}`,
            retrievedAt: new Date().toISOString(),
            reliability: doc?.documentQuality ?? 0.6,
            relation: 'supports',
        };
        
        const claim: Claim = {
            id: `${args.caseId}-udyam`,
            dimension: 'identity',
            label: 'Udyam Number',
            value: udyam,
            status: 'pending',
            evidence: [evidence]
        };
        
        const existing = state.claims;
        const idx = existing.findIndex(c => c.id === claim.id);
        if (idx === -1) existing.push(claim);
        else existing[idx] = { ...existing[idx], ...claim };
        
        this.caseStore.updateClaims(args.caseId, existing);
        return { ok: true, data: { udyamNumber: udyam } };
    }

    @Tool({
        name: 'extractGSTCertificate',
        description: 'Extract GST Registration details.',
        inputSchema: z.object({
            caseId: z.string(),
            businessName: z.string(),
            documentRef: z.string().optional(),
        }),
    })
    async extractGSTCertificate(args: { caseId: string; businessName: string; documentRef?: string }) {
        const docKey = args.documentRef ?? 'REG-CERT';
        const doc = MOCK_DOCUMENTS[docKey];
        const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
        const gst = doc?.gstNumber;
        
        if (!gst) return { ok: false, data: { error: 'No GST number found in document' } };
        
        const evidence: Evidence = {
            id: `ev-gst-${Date.now()}`,
            source: 'GST Extractor',
            snippet: `Extracted GST Number: ${gst}`,
            retrievedAt: new Date().toISOString(),
            reliability: doc?.documentQuality ?? 0.6,
            relation: 'supports',
        };
        
        const claim: Claim = {
            id: `${args.caseId}-gst`,
            dimension: 'identity',
            label: 'GST Number',
            value: gst,
            status: 'pending',
            evidence: [evidence]
        };
        
        const existing = state.claims;
        const idx = existing.findIndex(c => c.id === claim.id);
        if (idx === -1) existing.push(claim);
        else existing[idx] = { ...existing[idx], ...claim };
        
        this.caseStore.updateClaims(args.caseId, existing);
        return { ok: true, data: { gstNumber: gst } };
    }

    @Tool({
        name: 'extractTradeLicense',
        description: 'Extract Shop & Establishment / Trade License.',
        inputSchema: z.object({
            caseId: z.string(),
            businessName: z.string(),
            documentRef: z.string().optional(),
        }),
    })
    async extractTradeLicense(args: { caseId: string; businessName: string; documentRef?: string }) {
        const docKey = args.documentRef ?? 'REG-CERT';
        const doc = MOCK_DOCUMENTS[docKey];
        const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
        const tradeLicense = doc?.tradeLicenseNumber;
        
        if (!tradeLicense) return { ok: false, data: { error: 'No Trade License found' }, status: 'error' };
        
        const evidence: Evidence = {
            id: `ev-trade-${Date.now()}`,
            source: 'Trade License Extractor',
            snippet: `Extracted Trade License: ${tradeLicense}`,
            retrievedAt: new Date().toISOString(),
            reliability: doc?.documentQuality ?? 0.6,
            relation: 'supports',
        };
        
        const claim: Claim = {
            id: `${args.caseId}-trade`,
            dimension: 'identity',
            label: 'Trade License',
            value: tradeLicense,
            status: 'pending',
            evidence: [evidence]
        };
        
        const existing = state.claims;
        const idx = existing.findIndex(c => c.id === claim.id);
        if (idx === -1) existing.push(claim);
        else existing[idx] = { ...existing[idx], ...claim };
        
        this.caseStore.updateClaims(args.caseId, existing);
        return { ok: true, data: { tradeLicenseNumber: tradeLicense } };
    }

    @Tool({
        name: 'extractOwnershipProof',
        description: 'Extract property ownership or rent agreement details.',
        inputSchema: z.object({
            caseId: z.string(),
            businessName: z.string(),
            documentRef: z.string().optional(),
        }),
    })
    async extractOwnershipProof(args: { caseId: string; businessName: string; documentRef?: string }) {
        const docKey = args.documentRef ?? 'REG-CERT';
        const doc = MOCK_DOCUMENTS[docKey];
        const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
        const ownershipType = doc?.ownershipType ?? 'rented';
        
        const evidence: Evidence = {
            id: `ev-ownership-${Date.now()}`,
            source: 'Ownership Extractor',
            snippet: `Premises identified as: ${ownershipType}`,
            retrievedAt: new Date().toISOString(),
            reliability: doc?.documentQuality ?? 0.6,
            relation: 'supports',
        };
        
        const claim: Claim = {
            id: `${args.caseId}-ownership`,
            dimension: 'location',
            label: 'Premises Ownership',
            value: ownershipType,
            status: 'pending',
            evidence: [evidence]
        };
        
        const existing = state.claims;
        const idx = existing.findIndex(c => c.id === claim.id);
        if (idx === -1) existing.push(claim);
        else existing[idx] = { ...existing[idx], ...claim };
        
        this.caseStore.updateClaims(args.caseId, existing);
        return { ok: true, data: { ownershipType } };
    }

    @Tool({
        name: 'checkPremisesPhoto',
        description: 'Check business premises photo metadata (GPS EXIF) against claimed address location.',
        inputSchema: z.object({
            caseId: z.string(),
            businessName: z.string(),
            claimedLat: z.number().optional(),
            claimedLng: z.number().optional(),
            documentRef: z.string().optional(),
        }),
    })
    async checkPremisesPhoto(args: { caseId: string; businessName: string; claimedLat?: number; claimedLng?: number; documentRef?: string }) {
        const docKey = args.documentRef ?? 'REG-CERT';
        const doc = MOCK_DOCUMENTS[docKey];
        const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
        
        if (!doc?.photoLocation) {
            return { ok: false, data: { error: 'No premises photo available with EXIF data' } };
        }
        
        let match = false;
        let snippet = `Photo EXIF Location: [${doc.photoLocation.lat}, ${doc.photoLocation.lng}]`;
        if (args.claimedLat && args.claimedLng) {
            // Very simple distance mock
            const dist = Math.abs(args.claimedLat - doc.photoLocation.lat) + Math.abs(args.claimedLng - doc.photoLocation.lng);
            match = dist < 0.05;
            snippet += ` - Matches claimed address coords: ${match}`;
        }
        
        const evidence: Evidence = {
            id: `ev-photo-${Date.now()}`,
            source: 'Premises Photo Metadata',
            snippet,
            retrievedAt: new Date().toISOString(),
            reliability: 0.95, // EXIF data is generally reliable if present
            relation: match ? 'supports' : (args.claimedLat ? 'contradicts' : 'supports'),
        };
        
        const claim: Claim = {
            id: `${args.caseId}-photo`,
            dimension: 'location',
            label: 'Photo GPS Verification',
            value: `${doc.photoLocation.lat}, ${doc.photoLocation.lng}`,
            status: match ? 'verified' : (args.claimedLat ? 'contradicted' : 'pending'),
            evidence: [evidence]
        };
        
        const existing = state.claims;
        const idx = existing.findIndex(c => c.id === claim.id);
        if (idx === -1) existing.push(claim);
        else existing[idx] = { ...existing[idx], ...claim };
        
        this.caseStore.updateClaims(args.caseId, existing);
        return { ok: true, data: { photoLocation: doc.photoLocation, match } };
    }
}
