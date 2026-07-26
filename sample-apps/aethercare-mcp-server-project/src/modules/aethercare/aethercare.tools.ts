import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';

interface HospitalRecord {
  id: string;
  name: string;
  city: string;
  state: string;
  pincode: string;
  empanelmentStatus: 'EMPANELED_ACTIVE' | 'SUSPENDED' | 'BLACK_LISTED' | 'UNDER_REVIEW';
  schemesSupported: string[];
  cashlessFacility: boolean;
  icuBedsAvailable: number;
  lastInspectionDate: string;
  warningFlags: string[];
  contactPhone: string;
  address: string;
}

const HOSPITALS_DATABASE: HospitalRecord[] = [
  {
    id: 'HOSP-TN-01',
    name: 'Kauvery Super Specialty Hospital',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600018',
    empanelmentStatus: 'EMPANELED_ACTIVE',
    schemesSupported: ['Chief Minister Comprehensive Health Insurance Scheme (CMCHIS TN)', 'Ayushman Bharat (PM-JAY)', 'CGHS'],
    cashlessFacility: true,
    icuBedsAvailable: 18,
    lastInspectionDate: '2026-07-10',
    warningFlags: [],
    contactPhone: '+91-44-4000-6000',
    address: 'Mylapore, Chennai, Tamil Nadu'
  },
  {
    id: 'HOSP-TN-02',
    name: 'PSG Super Specialty Hospital',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    pincode: '641004',
    empanelmentStatus: 'SUSPENDED',
    schemesSupported: ['CMCHIS (Tamil Nadu)', 'ECHS'],
    cashlessFacility: false,
    icuBedsAvailable: 0,
    lastInspectionDate: '2026-07-02',
    warningFlags: ['Cashless CMCHIS facility suspended for audit investigation by SAFU Tamil Nadu'],
    contactPhone: '+91-422-257-0170',
    address: 'Peelamedu, Avinashi Road, Coimbatore, Tamil Nadu'
  },
  {
    id: 'HOSP-KA-01',
    name: 'Narayana Health City',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560099',
    empanelmentStatus: 'EMPANELED_ACTIVE',
    schemesSupported: ['Suvarna Arogya Suraksha Trust (SAST KA)', 'Ayushman Bharat (PM-JAY)', 'CGHS'],
    cashlessFacility: true,
    icuBedsAvailable: 24,
    lastInspectionDate: '2026-06-28',
    warningFlags: [],
    contactPhone: '+91-80-7122-2222',
    address: 'Bommasandra Industrial Area, Hosur Road, Bengaluru, KA'
  },
  {
    id: 'HOSP-KL-01',
    name: 'Amrita Institute of Medical Sciences (AIMS)',
    city: 'Kochi',
    state: 'Kerala',
    pincode: '682041',
    empanelmentStatus: 'EMPANELED_ACTIVE',
    schemesSupported: ['Karunya Health Insurance Scheme (KHIIS Kerala)', 'Ayushman Bharat (PM-JAY)', 'CGHS'],
    cashlessFacility: true,
    icuBedsAvailable: 16,
    lastInspectionDate: '2026-06-15',
    warningFlags: [],
    contactPhone: '+91-484-285-1234',
    address: 'AIMS P.O., Edappally, Kochi, Kerala'
  },
  {
    id: 'HOSP-TS-01',
    name: 'Yashoda Super Specialty Hospital',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500082',
    empanelmentStatus: 'EMPANELED_ACTIVE',
    schemesSupported: ['Aarogyasri Health Scheme (Telangana)', 'Ayushman Bharat (PM-JAY)', 'CGHS'],
    cashlessFacility: true,
    icuBedsAvailable: 12,
    lastInspectionDate: '2026-07-05',
    warningFlags: [],
    contactPhone: '+91-40-4567-4567',
    address: 'Somajiguda, Raj Bhavan Road, Hyderabad, Telangana'
  },
  {
    id: 'HOSP-MH-01',
    name: 'City Care Super Specialty Hospital',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400012',
    empanelmentStatus: 'EMPANELED_ACTIVE',
    schemesSupported: ['Ayushman Bharat (PM-JAY)', 'MJPJAY (Maharashtra)', 'CGHS'],
    cashlessFacility: true,
    icuBedsAvailable: 14,
    lastInspectionDate: '2026-06-10',
    warningFlags: [],
    contactPhone: '+91-22-5551-0192',
    address: 'Sector 4, Parel, Mumbai, MH'
  },
  {
    id: 'HOSP-DL-01',
    name: 'Apollo Lifecare Hospital',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110025',
    empanelmentStatus: 'SUSPENDED',
    schemesSupported: ['CGHS', 'ECHS'],
    cashlessFacility: false,
    icuBedsAvailable: 0,
    lastInspectionDate: '2026-07-01',
    warningFlags: ['Cashless facility suspended due to audit investigation', 'Reported out-of-pocket cash demands'],
    contactPhone: '+91-11-4992-8800',
    address: 'Sarita Vihar, Mathura Road, New Delhi'
  }
];

const PRICE_CAPS_REGISTRY: Record<string, { category: string; legalMaxINR: number; nppaOrderRef: string; details: string }> = {
  'cardiac_stent_des': {
    category: 'Medical Device',
    legalMaxINR: 38260,
    nppaOrderRef: 'NPPA/SO-1334(E)/2025',
    details: 'Drug-Eluting Stents (DES) capped including GST. Mandatory breakdown in final hospital invoice.'
  },
  'knee_replacement_implants': {
    category: 'Medical Device',
    legalMaxINR: 64180,
    nppaOrderRef: 'NPPA/TKR-CAP/2025',
    details: 'Primary Knee Joint Replacement Implants (Standard Cobalt Chromium alloy).'
  },
  'icu_bed_daily_rate_pmjay': {
    category: 'Hospital Package',
    legalMaxINR: 4500,
    nppaOrderRef: 'NHA/PMJAY/RATE-LIST/2026',
    details: 'Daily ICU Bed Rate under PM-JAY including basic drugs, nursing charges, and monitoring.'
  },
  'cataract_surgery_package': {
    category: 'Surgical Package',
    legalMaxINR: 12500,
    nppaOrderRef: 'NHA/PMJAY/CATARACT/2025',
    details: 'Complete bilateral or mono-focal cataract surgery with fold-able IOL lens included.'
  }
};

export class AetherCareTools {

  @Tool({
    name: 'open_agentic_command_center',
    description: 'Launches the full-screen AetherCare Agentic Control Hub Dashboard providing a 360-degree start-to-end autonomous resolution for any healthcare emergency.',
    inputSchema: z.object({
      patient_query: z.string().default('Emergency heart stent surgery at Apollo Delhi under PM-JAY card, hospital demands 50000 cash').describe('Free-form patient scenario or healthcare question')
    })
  })
  @Widget('dashboard')
  async openAgenticCommandCenter(input: { patient_query?: string }, ctx: ExecutionContext) {
    const query = input?.patient_query || 'Emergency healthcare guidance';
    ctx.logger.info('Opening AetherCare Agentic Command Center', { query });

    return {
      dashboardTitle: 'AetherCare Agentic AI Command Center',
      activeSessionId: `SESS-${Math.floor(100000 + Math.random() * 900000)}`,
      userQuery: query,
      timestamp: new Date().toISOString(),
      agenticStatus: 'FULL_AUTO_PIPELINE_ACTIVE'
    };
  }

  @Tool({
    name: 'check_hospital_empanelment',
    description: 'Lookup hospital empanelment status, cashless facility availability, active scheme coverage across Tamil Nadu (CMCHIS), Karnataka (SAST), Kerala (Karunya), Telangana/AP (Aarogyasri), PM-JAY, CGHS, and SAFU blacklist alerts.',
    inputSchema: z.object({
      query: z.string().default('Chennai').describe('Hospital name, city, or pincode'),
      scheme_filter: z.string().optional().describe('Filter by specific scheme')
    })
  })
  @Widget('empanelment-card')
  async checkHospitalEmpanelment(input: { query?: string; scheme_filter?: string }, ctx: ExecutionContext) {
    const rawQuery = input?.query || '';
    ctx.logger.info('Searching hospital empanelment', { query: rawQuery, filter: input?.scheme_filter });

    const q = rawQuery.trim().toLowerCase();

    let results = HOSPITALS_DATABASE.filter(h =>
      h.name.toLowerCase().includes(q) ||
      h.city.toLowerCase().includes(q) ||
      h.pincode.includes(q) ||
      h.state.toLowerCase().includes(q)
    );

    // Universal fallback: if specific query has no match, return top matching hospitals rather than empty array!
    if (results.length === 0) {
      results = HOSPITALS_DATABASE.slice(0, 3);
    }

    if (input?.scheme_filter) {
      const sf = input.scheme_filter.toLowerCase();
      const filtered = results.filter(h => h.schemesSupported.some(s => s.toLowerCase().includes(sf)));
      if (filtered.length > 0) results = filtered;
    }

    return {
      searchQuery: rawQuery || 'All South & National Hospitals',
      schemeFilter: input?.scheme_filter || 'All Schemes',
      totalFound: results.length,
      timestamp: new Date().toISOString(),
      hospitals: results
    };
  }

  @Tool({
    name: 'verify_procedure_price_cap',
    description: 'Verify government legally mandated price caps for medical devices (stents, implants) and surgical packages under NPPA & NHA guidelines.',
    inputSchema: z.object({
      procedure_key: z.enum([
        'cardiac_stent_des',
        'knee_replacement_implants',
        'icu_bed_daily_rate_pmjay',
        'cataract_surgery_package'
      ]).default('cardiac_stent_des').describe('Procedure or device key'),
      quoted_price_inr: z.number().optional().describe('Hospital quoted estimate price in INR')
    })
  })
  @Widget('price-cap-audit')
  async verifyProcedurePriceCap(input: { procedure_key?: string; quoted_price_inr?: number }, ctx: ExecutionContext) {
    const key = input?.procedure_key || 'cardiac_stent_des';
    ctx.logger.info('Verifying procedure price cap', { key, price: input?.quoted_price_inr });

    const capInfo = PRICE_CAPS_REGISTRY[key] || PRICE_CAPS_REGISTRY['cardiac_stent_des'];
    const quoted = input?.quoted_price_inr ?? 65000;
    let isExceeded = false;
    let excessAmountINR = 0;
    let status: 'PASSED_WITHIN_CAP' | 'FRAUD_OVERCHARGE_RISK' | 'INFORMATIONAL' = 'INFORMATIONAL';

    if (quoted > capInfo.legalMaxINR) {
      isExceeded = true;
      excessAmountINR = Math.round((quoted - capInfo.legalMaxINR) * 100) / 100;
      status = 'FRAUD_OVERCHARGE_RISK';
    } else {
      status = 'PASSED_WITHIN_CAP';
    }

    return {
      procedureKey: key,
      category: capInfo.category,
      legalMaxINR: capInfo.legalMaxINR,
      quotedPriceINR: quoted,
      isExceeded,
      excessAmountINR,
      status,
      regulatoryOrder: capInfo.nppaOrderRef,
      officialDetails: capInfo.details,
      legalConsumerRight: 'Hospitals demanding charges above the NPPA/NHA cap are committing illegal price gouging punishable under DPCO 2013 & IT Act 2000.'
    };
  }

  @Tool({
    name: 'check_scheme_eligibility_and_docs',
    description: 'Check patient eligibility for public health insurance across South India & National schemes and generate required document checklist.',
    inputSchema: z.object({
      annual_family_income_inr: z.number().default(180000).describe('Annual household income in INR'),
      caste_category: z.enum(['GENERAL', 'OBC', 'SC', 'ST', 'EWS']).default('OBC').describe('Social category'),
      state: z.string().default('Tamil Nadu').describe('State of residence'),
      has_ration_card: z.boolean().default(true).describe('Ration card status')
    })
  })
  @Widget('document-checklist')
  async checkSchemeEligibilityAndDocs(input: { annual_family_income_inr?: number; caste_category?: string; state?: string; has_ration_card?: boolean }, ctx: ExecutionContext) {
    const income = input?.annual_family_income_inr ?? 180000;
    const caste = input?.caste_category ?? 'OBC';
    const state = input?.state ?? 'Tamil Nadu';
    const ration = input?.has_ration_card ?? true;

    ctx.logger.info('Checking scheme eligibility', { income, caste, state, ration });

    const isPMJAYEligible = ration || income <= 250000 || ['SC', 'ST', 'EWS'].includes(caste);
    const estimatedCoverageINR = isPMJAYEligible ? 500000 : 0;

    let stateSchemeName = `${state} Universal Health Scheme`;
    if (state.toLowerCase().includes('tamil')) stateSchemeName = "Chief Minister's Comprehensive Health Insurance Scheme (CMCHIS TN)";
    else if (state.toLowerCase().includes('karnataka')) stateSchemeName = "Suvarna Arogya Suraksha Trust (SAST KA)";
    else if (state.toLowerCase().includes('kerala')) stateSchemeName = "Karunya Health Insurance Scheme (KHIIS Kerala)";
    else if (state.toLowerCase().includes('telangana') || state.toLowerCase().includes('andhra')) stateSchemeName = "Aarogyasri Community Health Insurance Scheme";

    const requiredDocuments = [
      { name: 'Aadhaar Card of Patient', required: true, status: 'MANDATORY', note: 'Biometric verification at counter' },
      { name: 'Smart Ration Card / Rice Card', required: true, status: 'MANDATORY', note: 'Family verification for cashless entitlement' },
      { name: 'Doctor Pre-Authorization Letter', required: true, status: 'MANDATORY', note: 'Issued by hospital specialist' },
      { name: 'Ayushman / CMCHIS Golden Card', required: isPMJAYEligible, status: 'MANDATORY', note: 'Can be printed at hospital Mitra desk' }
    ];

    return {
      patientEligibility: {
        isEligiblePMJAY: isPMJAYEligible,
        coverageAmountINR: estimatedCoverageINR,
        primarySchemeName: isPMJAYEligible ? 'Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (PM-JAY)' : 'Private TPA Scheme',
        stateSpecificScheme: stateSchemeName
      },
      documentChecklist: requiredDocuments,
      actionSteps: [
        'Present Aadhaar & Ration card at the hospital Ayushman Mitra counter.',
        'Obtain initial diagnostic pre-auth requisition from treating specialist.',
        'Ensure hospital submits electronic pre-authorization before procedure starts.'
      ]
    };
  }

  @Tool({
    name: 'analyze_billing_fraud_risk',
    description: 'Audit line-item medical hospital bills or pre-treatment cost estimates to detect illegal out-of-pocket demands and price cap violations.',
    inputSchema: z.object({
      hospital_name: z.string().default('Kauvery Hospital Chennai').describe('Hospital name'),
      is_cashless_admission: z.boolean().default(true).describe('Cashless policy status'),
      line_items: z.array(z.object({
        item_name: z.string().describe('Item description'),
        amount_charged_inr: z.number().describe('Amount charged in INR')
      })).default([
        { item_name: 'Cardiac Stent DES', amount_charged_inr: 48000 },
        { item_name: 'ICU Bed Charges', amount_charged_inr: 6500 }
      ]).describe('Line items to audit')
    })
  })
  @Widget('price-cap-audit')
  async analyzeBillingFraudRisk(input: { hospital_name?: string; is_cashless_admission?: boolean; line_items?: Array<{ item_name: string; amount_charged_inr: number }> }, ctx: ExecutionContext) {
    const hospitalName = input?.hospital_name || 'Kauvery Hospital Chennai';
    const isCashless = input?.is_cashless_admission ?? true;
    const lineItems = input?.line_items || [
      { item_name: 'Cardiac Stent DES', amount_charged_inr: 48000 },
      { item_name: 'ICU Bed Charges', amount_charged_inr: 6500 }
    ];

    ctx.logger.info('Auditing medical bill for fraud risk', { hospital: hospitalName, lines: lineItems.length });

    let totalBilledINR = 0;
    let totalCapExcessINR = 0;
    const auditResults: Array<{ item: string; charged: number; maxAllowed: number; status: string; flag: string | null }> = [];

    for (const line of lineItems) {
      totalBilledINR += line.amount_charged_inr;
      const lower = (line.item_name || '').toLowerCase();
      let cap = line.amount_charged_inr;
      let flag: string | null = null;

      if (lower.includes('stent')) {
        cap = PRICE_CAPS_REGISTRY['cardiac_stent_des'].legalMaxINR;
        if (line.amount_charged_inr > cap) {
          flag = `Exceeds NPPA Cardiac Stent Price Cap of ₹${cap.toLocaleString('en-IN')}`;
          totalCapExcessINR += (line.amount_charged_inr - cap);
        }
      } else if (lower.includes('icu') && isCashless) {
        cap = PRICE_CAPS_REGISTRY['icu_bed_daily_rate_pmjay'].legalMaxINR;
        if (line.amount_charged_inr > cap) {
          flag = `Illegal extra ICU surcharge under Cashless admission`;
          totalCapExcessINR += (line.amount_charged_inr - cap);
        }
      }

      auditResults.push({
        item: line.item_name,
        charged: line.amount_charged_inr,
        maxAllowed: cap,
        status: flag ? 'VIOLATION' : 'VALID',
        flag
      });
    }

    const hasViolations = totalCapExcessINR > 0;

    return {
      hospitalName,
      isCashlessAdmission: isCashless,
      totalBilledINR,
      totalCapExcessINR,
      riskLevel: hasViolations ? 'HIGH_FRAUD_RISK' : 'CLEAN_COMPLIANT',
      auditSummary: hasViolations
        ? `Found ₹${totalCapExcessINR.toLocaleString('en-IN')} in illegal overcharges / price cap violations.`
        : 'All line items appear compliant with legal ceilings.',
      lineItemsAudit: auditResults,
      recourseAdvice: hasViolations
        ? 'File an instant grievance on NHA National Grievance Portal (14555) or report to State Anti-Fraud Unit (SAFU).'
        : 'Proceed with standard hospital billing approval.'
    };
  }

  @Tool({
    name: 'search_healthcare_announcements',
    description: 'Fetch recent government health circulars, SAFU hospital suspension notices across South India and National boards.',
    inputSchema: z.object({
      category: z.enum(['ALL', 'BLACK_LISTING', 'PRICE_CAPS', 'SCHEME_UPDATES']).default('ALL').describe('Category')
    })
  })
  async searchHealthcareAnnouncements(input: { category?: string }, ctx: ExecutionContext) {
    const category = input?.category || 'ALL';
    ctx.logger.info('Searching healthcare announcements', { category });

    const announcements = [
      {
        id: 'CIRC-TN-2026-012',
        title: 'SAFU Tamil Nadu Order: Temporary Suspension of 6 Private Facilities in Coimbatore & Madurai for Out-of-Pocket Cash Charges',
        date: '2026-07-22',
        category: 'BLACK_LISTING',
        summary: 'Chief Ministers Comprehensive Health Insurance Scheme (CMCHIS) suspended cashless billing rights.'
      },
      {
        id: 'CIRC-KA-2026-009',
        title: 'Suvarna Arogya Suraksha Trust (SAST Karnataka) Package Rate Expansion',
        date: '2026-07-15',
        category: 'SCHEME_UPDATES',
        summary: 'Enhanced tertiary care package coverage across Bengaluru and Mysuru trust hospitals.'
      },
      {
        id: 'CIRC-NPPA-2026-031',
        title: 'NPPA Revised Price Ceilings for Orthopedic Implants & Coronary Stents',
        date: '2026-06-15',
        category: 'PRICE_CAPS',
        summary: 'Updated maximum retail prices for medical devices enforced under DPCO 2013.'
      }
    ];

    const filtered = category === 'ALL'
      ? announcements
      : announcements.filter(a => a.category === category);

    return {
      categoryFilter: category,
      totalFound: filtered.length,
      announcements: filtered
    };
  }
}
