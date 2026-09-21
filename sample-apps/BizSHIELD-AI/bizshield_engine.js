/**
 * BizShield AI — Deterministic Calculation Engine
 * 
 * Ports the spatial, financial, risk, and compliance engines from Python to Node.js.
 * Provides the same mathematical results for the 3 seeded businesses and enables
 * re-evaluating all features for newly registered businesses.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Seeded Database / File Persistence
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'businesses.json');

// --- Seed Data Constants ---
const ARCHETYPES = [
  "student",
  "office_worker",
  "resident_family",
  "transient_commuter",
  "patient_caregiver",
  "tourist"
];

const MSME_THRESHOLDS = {
  micro: { investment_limit_inr: 25000000, turnover_limit_inr: 100000000 },
  small: { investment_limit_inr: 250000000, turnover_limit_inr: 1000000000 },
  medium: { investment_limit_inr: 1250000000, turnover_limit_inr: 5000000000 }
};

const CATEGORY_ORDER = ["micro", "small", "medium"];

const GENERATOR_TABLE = {
  university: [9.0, { student: 0.62, office_worker: 0.20, resident_family: 0.05, transient_commuter: 0.08, patient_caregiver: 0.02, tourist: 0.03 }],
  school: [7.0, { student: 0.70, office_worker: 0.08, resident_family: 0.15, transient_commuter: 0.05, patient_caregiver: 0.02, tourist: 0.0 }],
  coaching_centre: [4.0, { student: 0.75, office_worker: 0.05, resident_family: 0.12, transient_commuter: 0.05, patient_caregiver: 0.03, tourist: 0.0 }],
  it_park: [8.5, { student: 0.05, office_worker: 0.78, resident_family: 0.02, transient_commuter: 0.13, patient_caregiver: 0.0, tourist: 0.02 }],
  office: [5.0, { student: 0.03, office_worker: 0.82, resident_family: 0.02, transient_commuter: 0.11, patient_caregiver: 0.0, tourist: 0.02 }],
  hospital: [6.5, { student: 0.02, office_worker: 0.22, resident_family: 0.10, transient_commuter: 0.05, patient_caregiver: 0.60, tourist: 0.01 }],
  clinic: [2.5, { student: 0.03, office_worker: 0.20, resident_family: 0.30, transient_commuter: 0.02, patient_caregiver: 0.44, tourist: 0.01 }],
  metro_station: [9.5, { student: 0.12, office_worker: 0.30, resident_family: 0.08, transient_commuter: 0.48, patient_caregiver: 0.0, tourist: 0.02 }],
  railway_station: [9.0, { student: 0.10, office_worker: 0.20, resident_family: 0.08, transient_commuter: 0.55, patient_caregiver: 0.02, tourist: 0.05 }],
  bus_stop: [4.0, { student: 0.15, office_worker: 0.20, resident_family: 0.15, transient_commuter: 0.48, patient_caregiver: 0.02, tourist: 0.0 }],
  mall: [8.0, { student: 0.18, office_worker: 0.22, resident_family: 0.35, transient_commuter: 0.05, patient_caregiver: 0.02, tourist: 0.18 }],
  market: [6.0, { student: 0.12, office_worker: 0.18, resident_family: 0.45, transient_commuter: 0.10, patient_caregiver: 0.05, tourist: 0.10 }],
  residential: [3.5, { student: 0.10, office_worker: 0.15, resident_family: 0.65, transient_commuter: 0.05, patient_caregiver: 0.03, tourist: 0.02 }],
  restaurant: [3.0, { student: 0.15, office_worker: 0.30, resident_family: 0.25, transient_commuter: 0.15, patient_caregiver: 0.02, tourist: 0.13 }],
  cafe: [2.5, { student: 0.22, office_worker: 0.35, resident_family: 0.18, transient_commuter: 0.12, patient_caregiver: 0.01, tourist: 0.12 }],
  bank: [2.0, { student: 0.05, office_worker: 0.35, resident_family: 0.30, transient_commuter: 0.10, patient_caregiver: 0.18, tourist: 0.02 }],
  pharmacy: [2.0, { student: 0.03, office_worker: 0.20, resident_family: 0.35, transient_commuter: 0.05, patient_caregiver: 0.36, tourist: 0.01 }],
  hotel: [4.5, { student: 0.02, office_worker: 0.20, resident_family: 0.05, transient_commuter: 0.13, patient_caregiver: 0.0, tourist: 0.60 }],
  park: [2.0, { student: 0.20, office_worker: 0.15, resident_family: 0.40, transient_commuter: 0.05, patient_caregiver: 0.02, tourist: 0.18 }],
  temple: [3.0, { student: 0.08, office_worker: 0.15, resident_family: 0.45, transient_commuter: 0.07, patient_caregiver: 0.05, tourist: 0.20 }],
  gym: [2.0, { student: 0.25, office_worker: 0.40, resident_family: 0.20, transient_commuter: 0.10, patient_caregiver: 0.0, tourist: 0.05 }],
  cinema: [3.5, { student: 0.28, office_worker: 0.20, resident_family: 0.30, transient_commuter: 0.07, patient_caregiver: 0.0, tourist: 0.15 }]
};

const PRICE_BANDS = {
  student: [60, 180],
  office_worker: [150, 450],
  resident_family: [120, 350],
  transient_commuter: [50, 150],
  patient_caregiver: [100, 300],
  tourist: [200, 600]
};

const IDEAL_CUSTOMER = {
  textile_retail: { student: 0.15, office_worker: 0.20, resident_family: 0.45, transient_commuter: 0.05, patient_caregiver: 0.05, tourist: 0.10 },
  electronics_retail: { student: 0.20, office_worker: 0.40, resident_family: 0.20, transient_commuter: 0.08, patient_caregiver: 0.02, tourist: 0.10 },
  cafe: { student: 0.25, office_worker: 0.35, resident_family: 0.15, transient_commuter: 0.15, patient_caregiver: 0.02, tourist: 0.08 },
  restaurant: { student: 0.18, office_worker: 0.28, resident_family: 0.30, transient_commuter: 0.12, patient_caregiver: 0.02, tourist: 0.10 },
  generic_retail: { student: 0.18, office_worker: 0.22, resident_family: 0.35, transient_commuter: 0.12, patient_caregiver: 0.03, tourist: 0.10 }
};

const DAMAGE_FUNCTIONS = {
  textiles_paper: { 30: 0.55, 60: 0.90, 100: 1.00 },
  packaged_fmcg: { 30: 0.20, 60: 0.55, 100: 0.85 },
  heavy_machinery: { 30: 0.05, 60: 0.25, 100: 0.60 },
  electronics: { 30: 0.70, 60: 0.95, 100: 1.00 },
  furniture_fixtures: { 30: 0.30, 60: 0.60, 100: 0.90 },
  perishable_food: { 30: 0.65, 60: 0.95, 100: 1.00 },
  generic_inventory: { 30: 0.40, 60: 0.70, 100: 0.95 }
};

const HAZARD_BASE_RATES = {
  flood: {
    "30cm": { probability: 0.040, label: "minor street flooding, 30cm" },
    "60cm": { probability: 0.015, label: "moderate flooding, 60cm" },
    "100cm": { probability: 0.005, label: "severe flooding, 100cm" }
  },
  heavy_rain: {
    "30cm": { probability: 0.060, label: "heavy rainfall event" },
    "60cm": { probability: 0.022, label: "very heavy rainfall" },
    "100cm": { probability: 0.009, label: "extreme rainfall" }
  }
};

const LOCATION_MULTIPLIERS = {
  "19.1136,72.8697": 2.0,   // Andheri, Mumbai
  "19.076,72.8777": 1.9,    // Mumbai
  "12.9716,77.5946": 0.7    // Bangalore
};

const WEEKDAY_SHAPES = {
  university:      [0,0,0,0,0,0,5,30,90,95,85,70,40,60,90,95,80,40,10,5,3,2,1,0],
  school:          [0,0,0,0,0,0,10,60,95,90,70,30,20,50,85,80,40,10,3,2,1,1,0,0],
  coaching_centre: [0,0,0,0,0,0,0,5,10,15,20,25,15,20,30,60,90,95,70,30,10,5,2,0],
  it_park:         [0,0,0,0,0,0,5,25,60,85,95,90,40,70,90,95,85,60,20,8,3,2,1,0],
  office:          [0,0,0,0,0,0,5,20,55,80,90,85,40,65,85,90,75,50,15,5,2,1,1,0],
  hospital:        [5,5,5,5,5,10,30,55,70,75,70,65,55,65,70,70,65,55,35,20,12,8,6,5],
  clinic:          [0,0,0,0,0,0,5,20,40,55,60,50,15,45,60,70,60,30,10,3,1,0,0,0],
  metro_station:   [2,1,1,1,1,5,40,95,85,40,35,40,35,40,45,50,60,95,80,40,25,15,8,3],
  railway_station: [10,5,3,3,3,8,35,80,70,50,45,50,45,50,55,60,70,90,75,50,35,25,18,12],
  bus_stop:        [1,1,1,1,1,3,20,50,45,30,25,28,25,30,35,40,50,55,40,20,12,8,4,2],
  mall:            [2,1,1,1,1,1,2,5,10,15,20,25,30,35,40,50,70,85,90,85,70,40,15,5],
  market:          [3,2,1,1,1,1,5,20,40,55,65,70,60,65,70,75,80,75,60,40,20,12,6,3],
  residential:     [8,5,3,3,3,3,8,25,35,25,15,12,12,15,20,25,40,60,75,80,70,50,25,12],
  restaurant:      [5,3,2,2,2,2,5,10,15,20,25,40,55,35,30,40,60,85,95,90,70,40,15,8],
  cafe:            [3,2,1,1,1,1,5,20,45,60,65,55,45,50,60,65,55,40,25,15,10,6,3,2],
  bank:            [0,0,0,0,0,0,5,20,40,55,60,55,10,45,55,55,45,25,5,2,1,0,0,0],
  pharmacy:        [5,3,2,2,2,2,5,15,25,35,40,40,25,35,45,50,50,45,40,30,20,12,8,5],
  hotel:           [15,10,8,8,8,10,20,35,45,50,55,60,55,55,55,60,70,80,85,80,65,45,30,20],
  park:            [2,1,1,1,1,1,3,10,20,15,12,10,15,12,15,20,35,50,60,45,30,15,5,2],
  temple:          [5,3,2,2,2,3,15,40,30,15,10,20,15,10,12,15,25,30,20,15,10,8,5,3],
  gym:             [2,1,1,1,1,2,8,15,10,8,8,12,15,10,12,20,35,55,70,60,40,20,8,3],
  cinema:          [2,1,1,1,1,1,1,2,3,5,8,12,15,18,22,30,45,60,80,90,85,60,25,5]
};

const WEEKEND_SHAPES = {
  university:      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,10,8,5,3,1,0],
  school:          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  coaching_centre: [0,0,0,0,0,0,0,0,5,10,20,25,15,20,35,50,70,80,60,30,10,5,2,0],
  it_park:         [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,8,5,3,1,0,0],
  office:          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,3,2,1,0,0],
  hospital:        [5,5,5,5,5,5,15,30,45,50,50,48,45,48,50,50,48,45,35,25,18,12,8,6],
  clinic:          [0,0,0,0,0,0,0,5,15,25,35,40,15,35,45,50,40,25,10,3,1,0,0,0],
  metro_station:   [3,2,1,1,1,2,8,20,30,35,40,42,40,42,45,48,55,65,60,40,25,15,8,4],
  railway_station: [12,8,5,4,4,6,20,45,55,50,48,50,48,50,52,55,60,70,65,50,38,28,20,15],
  bus_stop:        [1,1,1,1,1,2,5,12,18,22,25,28,25,28,30,32,38,42,35,22,14,8,4,2],
  mall:            [3,2,1,1,1,1,1,3,8,15,25,35,45,50,55,65,80,92,98,95,82,55,25,8],
  market:          [3,2,1,1,1,1,2,8,20,35,50,60,65,65,68,70,75,72,65,50,30,18,8,4],
  residential:     [12,8,5,4,4,4,8,18,28,35,30,25,25,28,32,38,50,65,75,78,65,45,22,15],
  restaurant:      [5,3,2,2,2,2,3,8,15,25,35,50,60,45,40,50,65,90,98,92,75,45,18,10],
  cafe:            [3,2,1,1,1,1,2,8,20,35,45,50,45,48,55,60,55,45,30,20,12,7,4,2],
  bank:            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  pharmacy:        [5,3,2,2,2,2,5,10,20,30,38,40,28,38,48,52,52,48,42,32,22,14,9,6],
  hotel:           [15,10,8,8,8,10,18,30,40,48,55,60,55,55,55,60,72,82,88,82,68,48,32,22],
  park:            [2,1,1,1,1,1,2,5,15,28,35,30,25,25,28,35,50,65,70,55,38,20,8,3],
  temple:          [8,5,3,3,3,5,25,55,45,25,18,30,22,18,20,25,35,40,30,22,15,12,8,5],
  gym:             [8,5,3,3,3,5,25,55,45,25,18,30,22,18,20,25,35,40,30,22,15,12,8,5], // placeholder / fallback
  cinema:          [2,1,1,1,1,1,1,1,2,5,10,15,20,25,30,40,55,75,90,95,92,75,35,8]
};

const SCHEMES = [
  {
    scheme_id: "cgtmse_credit_guarantee",
    name: "Credit Guarantee Fund Trust for Micro and Small Enterprises (CGTMSE)",
    ministry: "Ministry of MSME",
    summary: "Collateral-free credit guarantee up to ₹5 crore for micro and small enterprises.",
    benefit: "Up to 85% guarantee coverage on loans up to ₹5 crore; collateral-free.",
    eligibility: {
      all: [
        { field: "udyam_category", in: ["micro", "small"] },
        { field: "entity_type", in: ["proprietorship", "partnership", "pvt_ltd", "llp"] },
        { field: "nic_code", not_in: ["65", "66", "84"] }
      ]
    },
    confidence: "verified",
    source_url: "https://cgtmse.in",
    documents: ["Udyam Registration Certificate", "PAN", "Project report", "Bank statement (12 months)", "GST registration"],
    how_to_apply: "Apply through a CGTMSE-member lending institution (most banks and NBFCs are members). The lender files the guarantee application online."
  },
  {
    scheme_id: "pmegp",
    name: "Prime Minister's Employment Generation Programme (PMEGP)",
    ministry: "Ministry of MSME / KVIC",
    summary: "Subsidy up to 35% on project cost for new micro enterprises.",
    benefit: "Margin money subsidy 25-35% of project cost (up to ₹50L manufacturing / ₹20L services).",
    eligibility: {
      all: [
        { field: "udyam_category", in: ["micro"] },
        { field: "years_in_operation", lte: 0 },
        { field: "entity_type", in: ["proprietorship", "partnership", "pvt_ltd", "llp"] }
      ]
    },
    confidence: "verified",
    source_url: "https://www.kvic.gov.in",
    documents: ["Aadhaar", "Project report", "Rural area proof (for higher subsidy)", "Bank sanction letter", "Udyam (after approval)"],
    how_to_apply: "Apply online via the KVIC PMEGP e-portal with project report and bank linkage."
  },
  {
    scheme_id: "udyam_registration",
    name: "Udyam Registration (MSME Registration)",
    ministry: "Ministry of MSME",
    summary: "Free online MSME registration enabling access to all MSME schemes.",
    benefit: "Statutory recognition; prerequisite for CGTMSE, subsidies, procurement benefits.",
    eligibility: {
      all: [
        { field: "udyam_category", in: ["micro", "small", "medium"] }
      ]
    },
    confidence: "verified",
    source_url: "https://udyamregistration.gov.in",
    documents: ["Aadhaar", "PAN", "Bank details"],
    how_to_apply: "Self-declaration online at udyamregistration.gov.in. No documents uploaded; information is verified via PAN and GSTN."
  },
  {
    scheme_id: "pm_vishwakarma",
    name: "PM Vishwakarma Yojana",
    ministry: "Ministry of Skill Development",
    summary: "Recognition, skilling, and toolkit support for 18 traditional trades.",
    benefit: "Recognition certificate, skill training, ₹15,000 toolkit incentive, collateral-free loan up to ₹3L.",
    eligibility: {
      all: [
        { field: "entity_type", in: ["proprietorship"] },
        { field: "business_category", in: ["tailoring", "carpentry", "blacksmith", "textile_retail"] }
      ]
    },
    confidence: "verified",
    source_url: "https://pmvishwakarma.gov.in",
    documents: ["Aadhaar", "Mobile number", "Bank account", "Trade evidence"],
    how_to_apply: "Register at pmvishwakarma.gov.in; verification at Common Service Centres."
  },
  {
    scheme_id: "mse_clc",
    name: "MSME Samadhaan — Delayed Payment Monitoring",
    ministry: "Ministry of MSME",
    summary: "File complaints against buyers delaying payments beyond 45 days.",
    benefit: "Legal recourse with interest for delayed payments from buyers to MSMEs.",
    eligibility: {
      all: [
        { field: "udyam_category", in: ["micro", "small", "medium"] }
      ]
    },
    confidence: "verified",
    source_url: "https://samadhaan.msme.gov.in",
    documents: ["Udyam Registration", "Invoice/contract", "Buyer details"],
    how_to_apply: "File case online at samadhaan.msme.gov.in under MSME Development Act, 2006."
  },
  {
    scheme_id: "zed_certification",
    name: "Zero Effect, Zero Defect (ZED) Certification",
    ministry: "Ministry of MSME",
    summary: "Subsidised ZED certification for manufacturing quality and sustainability.",
    benefit: "Up to 80% subsidy on certification cost; 10-25% additional subsidy for micro enterprises.",
    eligibility: {
      all: [
        { field: "udyam_category", in: ["micro", "small", "medium"] },
        { field: "nic_code", not_in: ["47", "56", "65", "66", "84"] }
      ]
    },
    confidence: "verified",
    source_url: "https://msme-zed.org",
    documents: ["Udyam Registration", "GST", "Manufacturing process documentation"],
    how_to_apply: "Apply at msme-zed.org; assessment by QCI-empanelled assessors."
  },
  {
    scheme_id: "mse_procurement",
    name: "MSME Public Procurement Policy (MSE Procurement)",
    ministry: "Ministry of MSME",
    summary: "25% mandatory government procurement from MSEs; 4% sub-target for SC/ST-owned.",
    benefit: "Access to government tenders; exemption from earnest money deposit for registered MSEs.",
    eligibility: {
      all: [
        { field: "udyam_category", in: ["micro", "small"] }
      ]
    },
    confidence: "verified",
    source_url: "https://sambandh.msme.gov.in",
    documents: ["Udyam Registration", "PAN", "GST", "Product catalogue"],
    how_to_apply: "Register on the MSME Sambandh portal; participate in GeM and departmental tenders."
  },
  {
    scheme_id: "stand_up_india",
    name: "Stand-Up India",
    ministry: "Department of Financial Services",
    summary: "Bank loans ₹10L-₹1cr for SC/ST and women entrepreneurs.",
    benefit: "Loan ₹10L to ₹1 crore; handholding support; refinancing by SIDBI.",
    eligibility: {
      all: [
        { field: "entity_type", in: ["proprietorship", "partnership", "pvt_ltd"] },
        { field: "udyam_category", in: ["micro", "small"] }
      ],
      any: [
        { field: "owner_category", in: ["sc", "st", "woman"] }
      ]
    },
    confidence: "likely",
    source_url: "https://www.standupmitra.in",
    documents: ["Aadhaar", "PAN", "Business plan", "SC/ST/woman certificate", "Bank account"],
    how_to_apply: "Apply through SCBs at standupmitra.in with a business plan and category certificate."
  },
  {
    scheme_id: "mudra_loan",
    name: "Pradhan Mantri Mudra Yojana (PMMY)",
    ministry: "Department of Financial Services",
    summary: "Collateral-free loans up to ₹10L for micro non-corporate enterprises.",
    benefit: "Shishu (up to ₹50K), Kishore (₹50K-5L), Tarun (₹5L-10L) collateral-free loans.",
    eligibility: {
      all: [
        { field: "udyam_category", in: ["micro"] },
        { field: "entity_type", in: ["proprietorship", "partnership"] }
      ]
    },
    confidence: "verified",
    source_url: "https://www.mudra.org.in",
    documents: ["Aadhaar", "PAN", "Bank statement", "Business address proof"],
    how_to_apply: "Apply at any commercial bank, RRB, NBFC, or MFI under the MUDRA scheme."
  },
  {
    scheme_id: "startup_india_seed",
    name: "Startup India Seed Fund Scheme (SISFS)",
    ministry: "DPIIT",
    summary: "Seed funding up to ₹50L for proof-of-concept and prototype-stage startups.",
    benefit: "Financial assistance up to ₹50L for product trials, market entry, and prototype.",
    eligibility: {
      all: [
        { field: "years_in_operation", lte: 2 },
        { field: "udyam_category", in: ["micro", "small"] },
        { field: "nic_code", not_in: ["65", "66", "84"] }
      ]
    },
    confidence: "verified",
    source_url: "https://seedfund.startupindia.gov.in",
    documents: ["DPIIT recognition", "Audited financials", "Pitch deck", "Incubator recommendation"],
    how_to_apply: "Apply through empanelled incubators at seedfund.startupindia.gov.in."
  }
];

const COMPLIANCE_TEMPLATES = [
  { id: "gst_q1", category: "GST Filing", title: "GSTR-1 & GSTR-3B — Q1 FY2026-27", description: "Quarterly GST return filing for April-June quarter.", frequency: "quarterly", authority: "CBIC / GSTN", penalty: "₹200/day late fee + interest on unpaid tax" },
  { id: "gst_q2", category: "GST Filing", title: "GSTR-1 & GSTR-3B — Q2 FY2026-27", description: "Quarterly GST return filing for July-September quarter.", frequency: "quarterly", authority: "CBIC / GSTN", penalty: "₹200/day late fee + interest on unpaid tax" },
  { id: "insurance_renewal", category: "Insurance Renewal", title: "Shopkeepers Package Policy Renewal", description: "Annual renewal of shop insurance covering fire, theft, and assets.", frequency: "annual", authority: "IRDAI-registered insurer", penalty: "Lapse in coverage — uninsured risk exposure" },
  { id: "loan_emi", category: "Loan Payment", title: "MUDRA Loan EMI", description: "Monthly installment for MUDRA Tarun loan.", frequency: "monthly", authority: "Lending bank", penalty: "₹750 + 2% penalty interest on overdue EMI" },
  { id: "trade_license", category: "License Renewal", title: "Municipal Trade License Renewal", description: "Annual renewal of local business trade license / Gumasta.", frequency: "annual", authority: "Municipal Corporation", penalty: "₹5,000-50,000 fine + possible closure order" },
  { id: "udyam_update", category: "Government Filing", title: "Udyam Annual Information Return", description: "Annual update of investment and turnover on Udyam portal.", frequency: "annual", authority: "Ministry of MSME", penalty: "Loss of MSME benefits and scheme eligibility" },
  { id: "pf_return", category: "Statutory Filing", title: "EPF Monthly Return", description: "Employees' Provident Fund monthly contribution filing.", frequency: "monthly", authority: "EPFO", penalty: "₹2,000 + 12% interest on delayed contribution" },
  { id: "professional_tax", category: "Tax Payment", title: "Professional Tax — Half-Yearly", description: "State professional tax payment for employees.", frequency: "half-yearly", authority: "State Commercial Tax Dept", penalty: "₹500 + 10% penalty" }
];

const DUE_DATE_OFFSETS = {
  biz_priya_textiles: { gst_q1: -5, gst_q2: 88, insurance_renewal: 12, loan_emi: 3, trade_license: 45, udyam_update: 22, pf_return: 8, professional_tax: 60 },
  biz_arjun_gadgets: { gst_q1: -12, gst_q2: 81, insurance_renewal: 30, loan_emi: 5, trade_license: 90, udyam_update: 15, pf_return: -2, professional_tax: 15 },
  biz_kavita_cafe: { gst_q1: 4, gst_q2: 93, insurance_renewal: 67, loan_emi: 10, trade_license: 120, udyam_update: 50, pf_return: 18, professional_tax: 75 }
};

const SUPPLY_CHAIN_TEMPLATES = [
  { id: "supplier_textile_gujarat", supplier_name: "Surat Textile Mills", material: "Cotton fabric rolls", region: "Surat, Gujarat", region_lat: 21.1702, region_lng: 72.8311, share_of_supply: 0.65, lead_time_days: 12, reorder_point_days: 18 },
  { id: "supplier_dyes_ahmedabad", supplier_name: "Ahmedabad Chemical Supply", material: "Dyes and finishing chemicals", region: "Ahmedabad, Gujarat", region_lat: 23.0225, region_lng: 72.5714, share_of_supply: 0.25, lead_time_days: 8, reorder_point_days: 14 },
  { id: "supplier_packaging_mumbai", supplier_name: "Mumbai Packaging Co.", material: "Packaging materials", region: "Mumbai, Maharashtra", region_lat: 19.0760, region_lng: 72.8777, share_of_supply: 0.10, lead_time_days: 3, reorder_point_days: 7 }
];

const REGIONAL_RISK = {
  "Surat, Gujarat": { flood_risk: 0.45, cyclone_risk: 0.20, transport_disruption: 0.30, political_risk: 0.05 },
  "Ahmedabad, Gujarat": { flood_risk: 0.15, cyclone_risk: 0.05, transport_disruption: 0.15, political_risk: 0.03 },
  "Mumbai, Maharashtra": { flood_risk: 0.70, cyclone_risk: 0.25, transport_disruption: 0.55, political_risk: 0.05 }
};

const DISASTER_PLAYBOOKS = {
  flood: {
    disaster_type: "flood",
    severity_levels: ["minor", "moderate", "severe"],
    immediate_actions: [
      "Ensure personal safety — evacuate if water level is rising rapidly",
      "Move inventory and machinery to upper floors if safe to do so",
      "Turn off electrical mains to prevent short-circuit damage",
      "Document damage with photographs and video before cleanup",
      "Contact your insurer within 24-48 hours to initiate claim",
      "Preserve damaged goods — do not dispose until insurer surveys",
      "Notify suppliers about potential delivery delays",
      "Sandbag entrances if further flooding is expected"
    ],
    insurance_guidance: [
      "Shopkeepers Package Policy — covers flood damage to stock and premises",
      "Fire & Allied Perils policy — check if flood extension is included",
      "Claim documents: FIR (if applicable), damage photos, stock register, purchase invoices, insurer survey report",
      "File claim within 7 days; request interim advance for urgent restoration"
    ],
    government_assistance: [
      "State Disaster Relief Fund (SDRF) — ex-gratia for damaged commercial premises",
      "NDRF (National Disaster Response Fund) — for severe calamity-declared events",
      "MSME Emergency Credit Line — collateral-free working capital post-disaster",
      "GST relief — extended filing deadlines in notified disaster zones"
    ],
    helpline_numbers: ["NDMA Helpline: 1078", "State Emergency Operations Centre: 112", "Insurance Ombudsman: 155255"]
  },
  cyclone: {
    disaster_type: "cyclone",
    severity_levels: ["depression", "cyclonic storm", "severe cyclonic"],
    immediate_actions: [
      "Secure outdoor signage, shutters, and loose objects",
      "Move perishable inventory indoors and away from windows",
      "Backup digital records to cloud storage",
      "Charge phones and keep emergency lights ready",
      "Stock emergency supplies: water, first-aid, torch",
      "After cyclone passes: photograph structural and inventory damage"
    ],
    insurance_guidance: [
      "Property insurance — covers wind and storm damage to building",
      "Stock insurance — covers inventory damage from cyclone",
      "Business interruption cover — check if included in your policy",
      "Claim documents: damage photos, meteorological department warning notice, structural assessment report"
    ],
    government_assistance: [
      "Cyclone relief — ex-gratia for commercial property damage",
      "MSME rehabilitation package — subsidized loans for restoration"
    ],
    helpline_numbers: ["NDMA Helpline: 1078", "IMD Cyclone Warning: 011-24611338"]
  },
  fire: {
    disaster_type: "fire",
    severity_levels: ["minor", "moderate", "major"],
    immediate_actions: [
      "Evacuate all persons immediately — life safety first",
      "Call fire brigade (101) and inform building management",
      "Do not re-enter until fire department declares safe",
      "Document all damage with photographs once safe",
      "Inform insurer immediately — fire claims are time-sensitive",
      "Preserve evidence of fire origin for investigation",
      "Arrange temporary premises if operations are disrupted"
    ],
    insurance_guidance: [
      "Fire & Allied Perils Policy — primary cover for fire damage",
      "Shopkeepers Package — includes fire cover for stock and assets",
      "Business Interruption — covers loss of profit during restoration",
      "Claim documents: FIR, fire brigade report, damage photos, stock register, purchase invoices, claim form within 7 days"
    ],
    government_assistance: [
      "State relief for fire-affected businesses — check state policy",
      "MSME emergency credit — working capital for restoration"
    ],
    helpline_numbers: ["Fire Brigade: 101", "Police: 100", "Insurance Ombudsman: 155255"]
  },
  earthquake: {
    disaster_type: "earthquake",
    severity_levels: ["minor", "moderate", "severe"],
    immediate_actions: [
      "Drop, cover, and hold on during tremors",
      "After shaking stops: check for structural damage before re-entering",
      "Document cracks, structural damage, and inventory loss with photos",
      "Turn off gas and electrical mains if damage is suspected",
      "Inform insurer and arrange structural safety assessment"
    ],
    insurance_guidance: [
      "Earthquake cover — usually an add-on to fire policy; verify inclusion",
      "Property insurance — covers structural damage if earthquake extension active",
      "Claim documents: structural assessment report, damage photos, FIR if applicable"
    ],
    government_assistance: [
      "NDRF assistance for severe earthquake events",
      "State relief for damaged commercial properties"
    ],
    helpline_numbers: ["NDMA Helpline: 1078", "NDRF: 9711077111"]
  },
  heatwave: {
    disaster_type: "heatwave",
    severity_levels: ["moderate", "severe", "extreme"],
    immediate_actions: [
      "Ensure adequate ventilation and cooling for perishable inventory",
      "Provide drinking water and rest breaks for employees",
      "Reduce outdoor work during peak heat hours (12:00-15:00)",
      "Check refrigeration units are functioning properly",
      "Monitor employees for heatstroke symptoms"
    ],
    insurance_guidance: [
      "Machinery breakdown — covers refrigeration/compressor failure",
      "Stock deterioration — check if heat-related spoilage is covered",
      "Workers compensation — covers heat-related illness for employees"
    ],
    government_assistance: [
      "Heat action plan relief — state-specific provisions",
      "Power tariff relief for commercial consumers during heatwave"
    ],
    helpline_numbers: ["NDMA Helpline: 1078", "Medical Emergency: 108"]
  }
};

const SEEDED_INSURANCE_EAL = {
  cyber: 8000,
  fire: 45000,
  shopkeepers: 60000
};

const TODAY = new Date("2026-07-31");

// Helper for seeded random number generation (Linear Congruential Generator)
function createRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Distance helper
function offset(lat, lng, dx_m, dy_m) {
  const dlat = dy_m / 111320.0;
  const dlng = dx_m / (111320.0 * Math.cos(lat * Math.PI / 180));
  return [parseFloat((lat + dlat).toFixed(6)), parseFloat((lng + dlng).toFixed(6))];
}

// Helper to generate a deterministic set of POIs around a lat/lng
function seedPois(lat, lng, businessId) {
  // compute unique seed integer from businessId string
  let seed = 42;
  if (businessId) {
    for (let i = 0; i < businessId.length; i++) {
      seed += businessId.charCodeAt(i);
    }
  }
  const rng = createRandom(seed);
  const pois = [];
  const layout = [
    ["metro_station", 1, [350, 120]],
    ["railway_station", 1, [900, -200]],
    ["university", 1, [520, 300]],
    ["school", 2, null],
    ["it_park", 1, [700, 250]],
    ["office", 3, null],
    ["hospital", 1, [600, -300]],
    ["clinic", 2, null],
    ["residential", 5, null],
    ["restaurant", 4, null],
    ["cafe", 3, null],
    ["bank", 2, null],
    ["pharmacy", 2, null],
    ["market", 1, [400, -150]],
    ["mall", 1, [800, 400]],
    ["bus_stop", 4, null],
    ["park", 1, null],
    ["temple", 2, null],
    ["gym", 2, null],
    ["cinema", 1, [650, 350]],
    ["coaching_centre", 2, null],
    ["hotel", 1, null]
  ];

  let pid = 1;
  for (const [cat, count, forced] of layout) {
    for (let c = 0; c < count; c++) {
      let dx, dy;
      if (forced) {
        dx = forced[0] + (rng() * 120 - 60);
        dy = forced[1] + (rng() * 120 - 60);
      } else {
        const r = 120 + rng() * 1080;
        const theta = rng() * 2 * Math.PI;
        dx = r * Math.cos(theta);
        dy = r * Math.sin(theta);
      }
      const [plat, plng] = offset(lat, lng, dx, dy);
      const dist = Math.hypot(dx, dy);

      const baseFootprints = {
        mall: 8000, university: 6000, it_park: 5000, hospital: 4000,
        school: 2500, railway_station: 3000, metro_station: 1800,
        market: 2000, cinema: 2200, hotel: 1800, residential: 600
      };
      const base_foot = baseFootprints[cat] || 300;
      const footprint = base_foot * (0.7 + rng() * 0.6);

      pois.append ? null : pois.push({
        id: pid++,
        category: cat,
        lat: plat,
        lng: plng,
        footprint_sqm: Math.round(footprint * 10) / 10,
        distance_m: Math.round(dist * 10) / 10
      });
    }
  }
  return pois;
}

// Blends the 168-hour curve
function expandCurve(weekday, weekend) {
  const curve = new Array(168).fill(0);
  for (let d = 0; d < 7; d++) {
    const isWd = d < 5; // 0-4 are Mon-Fri
    const shape = isWd ? weekday : weekend;
    for (let h = 0; h < 24; h++) {
      curve[d * 24 + h] = shape[h];
    }
  }
  const sum = curve.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    return curve.map(v => v / sum);
  }
  return curve;
}

// ---------------------------------------------------------------------------
// Seeded businesses database (stored in memory, synchronised with file if possible)
// ---------------------------------------------------------------------------
let seededBusinesses = [
  {
    id: "biz_priya_textiles",
    name: "Priya Textiles",
    owner: "Priya Sharma",
    nic_code: "47",
    entity_type: "proprietorship",
    investment_inr: 4200000,
    annual_turnover_inr: 8400000,
    employee_count: 6,
    latitude: 19.1136,
    longitude: 72.8697,
    floor_level: 0,
    state: "Maharashtra",
    export_status: "none",
    years_in_operation: 7,
    business_category: "textile_retail",
    udyam_category: "micro",
    assets: [
      { asset_class: "textiles_paper", declared_value_inr: 3400000, floor_level: 0, peak_season_multiplier: 1.6 },
      { asset_class: "furniture_fixtures", declared_value_inr: 3500000, floor_level: 0, peak_season_multiplier: 1.0 },
      { asset_class: "electronics", declared_value_inr: 1200000, floor_level: 1, peak_season_multiplier: 1.0 }
    ],
    financial: {
      cash_inr: 460000,
      avg_monthly_burn_inr: 195000,
      revenue_inr: 8400000,
      cogs_inr: 5040000,
      opex_inr: 1900000,
      dio_days: 58,
      dso_days: 9,
      dpo_days: 21,
      top_customer_share: 0.22,
      ebitda_inr: 1100000,
      interest_inr: 180000,
      principal_inr: 240000,
      sector_benchmark_margin: 0.14
    }
  },
  {
    id: "biz_arjun_gadgets",
    name: "Arjun Gadgets",
    owner: "Arjun Mehta",
    nic_code: "47",
    entity_type: "pvt_ltd",
    investment_inr: 32000000,
    annual_turnover_inr: 62000000,
    employee_count: 11,
    latitude: 19.0760,
    longitude: 72.8777,
    floor_level: 0,
    state: "Maharashtra",
    export_status: "none",
    years_in_operation: 4,
    business_category: "electronics_retail",
    udyam_category: "small",
    assets: [
      { asset_class: "electronics", declared_value_inr: 1500000, floor_level: 0, peak_season_multiplier: 1.3 },
      { asset_class: "packaged_fmcg", declared_value_inr: 300000, floor_level: 0, peak_season_multiplier: 1.2 },
      { asset_class: "furniture_fixtures", declared_value_inr: 180000, floor_level: 0, peak_season_multiplier: 1.0 }
    ],
    financial: {
      cash_inr: 1200000,
      avg_monthly_burn_inr: 310000,
      revenue_inr: 12500000,
      cogs_inr: 8750000,
      opex_inr: 2100000,
      dio_days: 42,
      dso_days: 14,
      dpo_days: 30,
      top_customer_share: 0.31,
      ebitda_inr: 1400000,
      interest_inr: 95000,
      principal_inr: 130000,
      sector_benchmark_margin: 0.11
    }
  },
  {
    id: "biz_kavita_cafe",
    name: "Kavita's Cafe",
    owner: "Kavita Rao",
    nic_code: "56",
    entity_type: "partnership",
    investment_inr: 1800000,
    annual_turnover_inr: 4600000,
    employee_count: 5,
    latitude: 12.9716,
    longitude: 77.5946,
    floor_level: 0,
    state: "Karnataka",
    export_status: "none",
    years_in_operation: 3,
    business_category: "cafe",
    udyam_category: "micro",
    assets: [
      { asset_class: "perishable_food", declared_value_inr: 220000, floor_level: 0, peak_season_multiplier: 1.4 },
      { asset_class: "furniture_fixtures", declared_value_inr: 400000, floor_level: 0, peak_season_multiplier: 1.0 },
      { asset_class: "packaged_fmcg", declared_value_inr: 90000, floor_level: 0, peak_season_multiplier: 1.1 }
    ],
    financial: {
      cash_inr: 190000,
      avg_monthly_burn_inr: 145000,
      revenue_inr: 4600000,
      cogs_inr: 2530000,
      opex_inr: 1350000,
      dio_days: 12,
      dso_days: 4,
      dpo_days: 18,
      top_customer_share: 0.12,
      ebitda_inr: 520000,
      interest_inr: 60000,
      principal_inr: 80000,
      sector_benchmark_margin: 0.16
    }
  }
];

function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(seededBusinesses, null, 2));
  } else {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      let backfilled = false;
      data.forEach(b => {
        // Defensive backfill: older/partial saved records may predate a schema field.
        // Recomputing it here prevents a stale persisted file from crashing routes
        // that assume every business has a full profile (e.g. scheme eligibility).
        if (!b.udyam_category && typeof b.investment_inr === 'number' && typeof b.annual_turnover_inr === 'number') {
          b.udyam_category = classifyMsme(b.investment_inr, b.annual_turnover_inr);
          backfilled = true;
        }
      });
      seededBusinesses.length = 0;
      seededBusinesses.push(...data);
      if (backfilled) {
        console.warn('[initDb] Backfilled missing udyam_category on one or more persisted business records.');
        saveDb();
      }
    } catch (e) {
      console.error('Error reading JSON DB file, using memory fallback:', e);
    }
  }
}

initDb();

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(seededBusinesses, null, 2));
  } catch (e) {
    console.error('Error saving JSON DB file:', e);
  }
}

// ---------------------------------------------------------------------------
// Business Registration / Helper Engines
// ---------------------------------------------------------------------------
function classifyMsme(investment, turnover) {
  for (const cat of CATEGORY_ORDER) {
    const lim = MSME_THRESHOLDS[cat];
    if (investment <= lim.investment_limit_inr && turnover <= lim.turnover_limit_inr) {
      return cat;
    }
  }
  return "large_enterprise";
}

function registerBusiness(profile) {
  const category = classifyMsme(profile.investment_inr, profile.annual_turnover_inr);
  
  // Check if we are updating an existing profile
  if (profile.id) {
    const existingIdx = seededBusinesses.findIndex(b => b.id === profile.id);
    if (existingIdx !== -1) {
      const business = {
        id: profile.id,
        name: profile.name,
        owner: profile.owner || 'Business Owner',
        nic_code: profile.nic_code || '47',
        entity_type: profile.entity_type || 'proprietorship',
        investment_inr: parseFloat(profile.investment_inr),
        annual_turnover_inr: parseFloat(profile.annual_turnover_inr),
        employee_count: parseInt(profile.employee_count || 1),
        latitude: parseFloat(profile.latitude || 19.0760),
        longitude: parseFloat(profile.longitude || 72.8777),
        floor_level: parseInt(profile.floor_level || 0),
        state: profile.state || 'Maharashtra',
        export_status: profile.export_status || 'none',
        years_in_operation: parseInt(profile.years_in_operation || 0),
        business_category: profile.business_category || 'generic_retail',
        udyam_category: category,
        assets: profile.assets || [],
        financial: profile.financial || {
          cash_inr: 50000,
          avg_monthly_burn_inr: 20000,
          revenue_inr: 500000,
          cogs_inr: 300000,
          opex_inr: 150000,
          dio_days: 30,
          dso_days: 10,
          dpo_days: 20,
          top_customer_share: 0.15,
          ebitda_inr: 50000,
          interest_inr: 5000,
          principal_inr: 10000,
          sector_benchmark_margin: 0.12
        }
      };
      seededBusinesses[existingIdx] = business;
      saveDb();
      return business;
    }
  }

  // Create new profile
  const business = {
    id: 'biz_' + profile.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(Math.random() * 1000),
    name: profile.name,
    owner: profile.owner || 'Business Owner',
    nic_code: profile.nic_code || '47',
    entity_type: profile.entity_type || 'proprietorship',
    investment_inr: parseFloat(profile.investment_inr),
    annual_turnover_inr: parseFloat(profile.annual_turnover_inr),
    employee_count: parseInt(profile.employee_count || 1),
    latitude: parseFloat(profile.latitude || 19.0760),
    longitude: parseFloat(profile.longitude || 72.8777),
    floor_level: parseInt(profile.floor_level || 0),
    state: profile.state || 'Maharashtra',
    export_status: profile.export_status || 'none',
    years_in_operation: parseInt(profile.years_in_operation || 0),
    business_category: profile.business_category || 'generic_retail',
    udyam_category: category,
    assets: profile.assets || [],
    financial: profile.financial || {
      cash_inr: 50000,
      avg_monthly_burn_inr: 20000,
      revenue_inr: 500000,
      cogs_inr: 300000,
      opex_inr: 150000,
      dio_days: 30,
      dso_days: 10,
      dpo_days: 20,
      top_customer_share: 0.15,
      ebitda_inr: 50000,
      interest_inr: 5000,
      principal_inr: 10000,
      sector_benchmark_margin: 0.12
    }
  };

  seededBusinesses.push(business);
  saveDb();
  return business;
}

// ---------------------------------------------------------------------------
// Feature 5/6: Market Intelligence Engine
// ---------------------------------------------------------------------------
function poiWeight(poi) {
  const d0 = 400.0;
  const strengthTable = GENERATOR_TABLE[poi.category];
  const g = strengthTable ? strengthTable[0] : 1.0;
  const decay = Math.exp(-poi.distance_m / d0);
  const sizeProxy = Math.max(poi.footprint_sqm || 300, 50) / 1000.0;
  return g * decay * sizeProxy;
}

function computeMarketIntelligence(businessId, latOverride, lngOverride, catOverride) {
  const biz = seededBusinesses.find(b => b.id === businessId);
  if (!biz && !latOverride) return null;

  const lat = latOverride !== undefined ? parseFloat(latOverride) : biz.latitude;
  const lng = lngOverride !== undefined ? parseFloat(lngOverride) : biz.longitude;
  const category = catOverride || (biz ? biz.business_category : "generic_retail");

  const pois = seedPois(lat, lng, businessId);

  // filter to tertiary catchment (2000m)
  const filteredPois = pois.filter(p => p.distance_m <= 2000);

  // 1. Archetype Vector
  const accum = {};
  ARCHETYPES.forEach(a => { accum[a] = 0.0; });
  filteredPois.forEach(p => {
    const w = poiWeight(p);
    const table = GENERATOR_TABLE[p.category];
    const contrib = table ? table[1] : {};
    ARCHETYPES.forEach(a => {
      accum[a] += w * (contrib[a] || 0.0);
    });
  });
  let totalWeight = Object.values(accum).reduce((a, b) => a + b, 0);
  const archetype_vector = {};
  ARCHETYPES.forEach(a => {
    archetype_vector[a] = totalWeight > 0 ? accum[a] / totalWeight : 1.0 / ARCHETYPES.length;
  });

  // 2. 168h Curve
  let expandedCurves = [];
  filteredPois.forEach(p => {
    const w = poiWeight(p);
    const wd = WEEKDAY_SHAPES[p.category] || new Array(24).fill(5);
    const we = WEEKEND_SHAPES[p.category] || new Array(24).fill(5);
    expandedCurves.push({ weight: w, curve: expandCurve(wd, we) });
  });

  const curve168 = new Array(168).fill(0.0);
  for (let h = 0; h < 168; h++) {
    let hourSum = 0.0;
    expandedCurves.forEach(ec => {
      hourSum += ec.weight * ec.curve[h];
    });
    curve168[h] = hourSum;
  }
  let curveSum = curve168.reduce((a, b) => a + b, 0);
  const hourly_curve_168 = curveSum > 0 ? curve168.map(v => v / curveSum) : curve168;

  // 3. Peaks summary
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let peakIdx = 0;
  let peakVal = -1;
  for (let i = 0; i < 168; i++) {
    if (hourly_curve_168[i] > peakVal) {
      peakVal = hourly_curve_168[i];
      peakIdx = i;
    }
  }
  const peakDay = Math.floor(peakIdx / 24);
  const peakHour = peakIdx % 24;

  let wd_vol = 0;
  for (let d = 0; d < 5; d++) {
    for (let h = 0; h < 24; h++) wd_vol += hourly_curve_168[d * 24 + h];
  }
  let we_vol = 0;
  for (let d = 5; d < 7; d++) {
    for (let h = 0; h < 24; h++) we_vol += hourly_curve_168[d * 24 + h];
  }
  const weekendRatio = wd_vol > 0 ? we_vol / (wd_vol / 5) : 0;

  let tue_vol = 0;
  for (let h = 0; h < 24; h++) tue_vol += hourly_curve_168[1 * 24 + h];
  let sun_vol = 0;
  for (let h = 0; h < 24; h++) sun_vol += hourly_curve_168[6 * 24 + h];
  const sunVsTue = tue_vol > 0 ? sun_vol / tue_vol : 0;

  const peak_summary = {
    peak_day: dayNames[peakDay],
    peak_hour: peakHour,
    peak_window: `${String(peakHour).padStart(2, '0')}:00-${String((peakHour + 1) % 24).padStart(2, '0')}:00`,
    weekend_to_weekday_ratio: Math.round(weekendRatio * 1000) / 1000,
    sunday_vs_tuesday_ratio: Math.round(sunVsTue * 1000) / 1000
  };

  // 4. Huff Gravity Model (weekly footfall)
  const compCats = {
    cafe: ["cafe", "restaurant"],
    textile_retail: ["market"],
    electronics_retail: ["market"],
    restaurant: ["restaurant", "cafe"]
  }[category] || ["market", "cafe"];

  const competitors = filteredPois.filter(p => compCats.includes(p.category));
  const a_site = 400.0;
  let captured = 0.0;
  let captured_without = 0.0;

  filteredPois.forEach(node => {
    const d_node = Math.max(node.distance_m, 50.0);
    const demand = poiWeight(node);
    const u_site = a_site / Math.pow(d_node, 2.0);

    let u_comp = 0.0;
    competitors.forEach(comp => {
      const d_comp = Math.max(Math.abs(comp.distance_m - node.distance_m), 50.0);
      const a_comp = comp.footprint_sqm || 300;
      u_comp += a_comp / Math.pow(d_comp, 2.0);
    });

    const p_site = (u_site + u_comp) > 0 ? u_site / (u_site + u_comp) : 0.0;
    captured += demand * p_site;

    const p_comp = (u_site + u_comp) > 0 ? u_comp / (u_site + u_comp) : 0.0;
    captured_without += demand * p_comp;
  });

  const weeklyFootfall = Math.round(captured * 850);
  const weeklyFootfallWithout = Math.round(captured_without * 850);

  const huff = {
    capturable_footfall_weekly: weeklyFootfall,
    capturable_footfall_without_new_store: weeklyFootfallWithout,
    competitor_count: competitors.length,
    competitor_categories: compCats,
    huff_lambda: 2.0
  };

  // 5. Saturation Index
  const supplyCount = competitors.length;
  const nonCompDemand = filteredPois.filter(p => !compCats.includes(p.category)).reduce((s, p) => s + poiWeight(p), 0);
  const saturation_index = nonCompDemand > 0 ? Math.round((supplyCount / (nonCompDemand * 0.3)) * 1000) / 1000 : 1.0;

  // 6. Opportunity Score Breakdown
  const customerPotential = Math.min(100, 100 * Math.log10(weeklyFootfall + 1) / Math.log10(3000));
  const competitionScore = 100 * (1 - Math.min(saturation_index, 1.5) / 1.5);

  // Demand Fit
  const ideal = IDEAL_CUSTOMER[category] || IDEAL_CUSTOMER.generic_retail;
  let dot = 0, na = 0, nb = 0;
  ARCHETYPES.forEach(a => {
    dot += archetype_vector[a] * (ideal[a] || 0.0);
    na += Math.pow(archetype_vector[a], 2.0);
    nb += Math.pow(ideal[a] || 0.0, 2.0);
  });
  const demand_fit = (na > 0 && nb > 0) ? (dot / (Math.sqrt(na) * Math.sqrt(nb))) * 100 : 0.0;

  // Accessibility
  const transitCats = ["metro_station", "railway_station", "bus_stop"];
  const transitNodes = filteredPois.filter(p => transitCats.includes(p.category) && p.distance_m <= 400).length;
  const accessibility = Math.min(100, 25 * transitNodes + 10);

  // Growth
  const growthCats = ["coaching_centre", "gym", "cafe"];
  const growthNodes = filteredPois.filter(p => growthCats.includes(p.category)).length;
  const growth_signal = Math.min(100, growthNodes * 12);

  const weights = { customer: 0.30, competition: 0.25, demand_fit: 0.20, accessibility: 0.15, growth: 0.10 };
  const opportunity_score = Math.round(
    customerPotential * weights.customer +
    competitionScore * weights.competition +
    demand_fit * weights.demand_fit +
    accessibility * weights.accessibility +
    growth_signal * weights.growth
  );

  // Blended pricing
  let lowSum = 0, highSum = 0, weightTotal = 0;
  ARCHETYPES.forEach(a => {
    const lohi = PRICE_BANDS[a];
    const w = archetype_vector[a];
    if (lohi) {
      lowSum += lohi[0] * w;
      highSum += lohi[1] * w;
      weightTotal += w;
    }
  });
  const rawLow = weightTotal > 0 ? lowSum / weightTotal : 0;
  const rawHigh = weightTotal > 0 ? highSum / weightTotal : 0;
  const peakValArch = Math.max(...Object.values(archetype_vector));
  const confidence = peakValArch >= 0.5 ? "high" : (peakValArch >= 0.35 ? "medium" : "low");

  const recommended_pricing = {
    low: Math.round(rawLow),
    high: Math.round(rawHigh),
    confidence: confidence,
    note: "Illustrative ticket-size range blended from archetype mix; a production system calibrates against transaction feeds."
  };

  const topGenerators = filteredPois.map(p => ({
    ...p,
    weight: Math.round(poiWeight(p) * 100000) / 100000
  })).sort((a, b) => b.weight - a.weight).slice(0, 5);

  const catchment_counts = {
    primary: filteredPois.filter(p => p.distance_m <= 400).length,
    secondary: filteredPois.filter(p => p.distance_m <= 800).length,
    tertiary: filteredPois.filter(p => p.distance_m <= 2000).length
  };

  return {
    business_id: businessId || "custom_business",
    location: { lat, lng },
    business_category: category,
    catchments: {
      primary: { label: "5-min walk (~400m)", poi_count: catchment_counts.primary },
      secondary: { label: "10-min walk (~800m)", poi_count: catchment_counts.secondary },
      tertiary: { label: "10-min drive (~2km)", poi_count: catchment_counts.tertiary }
    },
    archetype_vector: archetype_vector,
    dominant_archetype: Object.keys(archetype_vector).reduce((a, b) => archetype_vector[a] > archetype_vector[b] ? a : b),
    hourly_curve_168: hourly_curve_168.map(v => Math.round(v * 100000) / 100000),
    peak_summary: peak_summary,
    opportunity_score: opportunity_score,
    score_breakdown: {
      customer_potential: { value: Math.round(customerPotential * 10) / 10, weight: weights.customer },
      competition: { value: Math.round(competitionScore * 10) / 10, weight: weights.competition, saturation_index: saturation_index },
      demand_fit: { value: Math.round(demand_fit * 10) / 10, weight: weights.demand_fit },
      accessibility: { value: Math.round(accessibility * 10) / 10, weight: weights.accessibility, transit_nodes: transitNodes },
      growth_signal: { value: Math.round(growth_signal * 10) / 10, weight: weights.growth }
    },
    saturation_index: saturation_index,
    capturable_footfall: huff,
    recommended_pricing: recommended_pricing,
    top_generators: topGenerators,
    poi_count_total: filteredPois.length,
    distance_decay_d0_m: 400.0,
    methodology: "Deterministic spatial analytics: POI weights with distance decay, 168h curves, Huff gravity, and MSME benchmarks."
  };
}

// ---------------------------------------------------------------------------
// Feature 2/3: Risk Engine & Insurance Advisor
// ---------------------------------------------------------------------------
function floorExposureFactor(floor) {
  if (floor <= 0) return 1.0;
  if (floor === 1) return 0.55;
  if (floor === 2) return 0.15;
  return 0.0;
}

function fractionDestroyed(assetClass, depthCm) {
  const table = DAMAGE_FUNCTIONS[assetClass] || DAMAGE_FUNCTIONS.generic_inventory;
  if (depthCm <= 0) return 0.0;
  if (depthCm >= 100) return table[100] || 1.0;

  const breakpoints = [30, 60, 100];
  let lower = 30, upper = 60;
  for (let i = 0; i < breakpoints.length - 1; i++) {
    const lo = breakpoints[i], hi = breakpoints[i + 1];
    if (depthCm >= lo && depthCm <= hi) {
      lower = lo;
      upper = hi;
      break;
    }
  }

  const f_lo = table[lower] || 0.0;
  const f_hi = table[upper] || 0.0;

  if (depthCm < lower) {
    return f_lo * (depthCm / lower);
  }
  const frac = (depthCm - lower) / (upper - lower);
  return f_lo + (f_hi - f_lo) * frac;
}

function computeExpectedLoss(businessId, hazardType = "flood") {
  const biz = seededBusinesses.find(b => b.id === businessId);
  if (!biz) return null;

  const rates = HAZARD_BASE_RATES[hazardType];
  if (!rates) return null;

  // location risk multipliers
  const key = `${biz.latitude.toFixed(4)},${biz.longitude.toFixed(4)}`;
  const loc_mult = LOCATION_MULTIPLIERS[key] || 1.0;

  const eventLosses = [];
  let total_eal = 0.0;

  for (const [depthStr, rate] of Object.entries(rates)) {
    const depthCm = parseInt(depthStr.replace("cm", ""));
    const p_event = rate.probability * loc_mult;
    let event_loss = 0.0;
    const assetBreakdown = [];

    biz.assets.forEach(asset => {
      const asset_floor = asset.floor_level !== undefined && asset.floor_level !== null ? asset.floor_level : biz.floor_level;
      const exposure = asset.declared_value_inr * asset.peak_season_multiplier * floorExposureFactor(asset_floor);
      const vuln = fractionDestroyed(asset.asset_class, depthCm);
      const loss = p_event * exposure * vuln;

      event_loss += loss;
      assetBreakdown.push({
        asset_class: asset.asset_class,
        declared_value_inr: asset.declared_value_inr,
        floor_level: asset_floor,
        exposure_at_risk_inr: Math.round(exposure),
        vulnerability_coef: Math.round(vuln * 1000) / 1000,
        loss_inr: Math.round(loss)
      });
    });

    total_eal += event_loss;
    eventLosses.push({
      intensity: depthStr,
      label: rate.label,
      probability: Math.round(p_event * 10000) / 10000,
      base_probability: rate.probability,
      location_multiplier: loc_mult,
      expected_loss_inr: Math.round(event_loss),
      asset_breakdown: assetBreakdown
    });
  }

  return {
    business_id: businessId,
    hazard_type: hazardType,
    expected_annual_loss_inr: Math.round(total_eal),
    expected_annual_loss_lakhs: Math.round((total_eal / 100000) * 100) / 100,
    events: eventLosses,
    formula: "EAL = Sum P(event) * Exposure_at_risk * Vulnerability(intensity)",
    location: { lat: biz.latitude, lng: biz.longitude, risk_multiplier: loc_mult },
    assumptions: "Hazard rates and damage multipliers are illustrative coefficients calibrated for the demo."
  };
}

function insuranceAdvisor(businessId) {
  const biz = seededBusinesses.find(b => b.id === businessId);
  if (!biz) return null;

  const totalInsured = biz.assets.reduce((sum, a) => sum + (a.declared_value_inr * a.peak_season_multiplier), 0);
  const flood_eal = computeExpectedLoss(businessId, "flood")?.expected_annual_loss_inr || 0;

  const products = {
    flood: { name: "Flood & Natural Disaster Cover", premium_rate_low: 0.0085, premium_rate_high: 0.0130, hazard_type: "flood" },
    cyber: { name: "Cyber Liability Insurance", premium_rate_low: 0.0120, premium_rate_high: 0.0180, hazard_type: null },
    fire: { name: "Fire & Allied Perils", premium_rate_low: 0.0040, premium_rate_high: 0.0070, hazard_type: null },
    shopkeepers: { name: "Shopkeepers Package Policy", premium_rate_low: 0.0060, premium_rate_high: 0.0090, hazard_type: null }
  };

  const eal_map = { flood: flood_eal, ...SEEDED_INSURANCE_EAL };
  const comparisons = [];

  for (const [key, prod] of Object.entries(products)) {
    const eal = eal_map[key] || 0;
    const prem_low = Math.round(totalInsured * prod.premium_rate_low);
    const prem_high = Math.round(totalInsured * prod.premium_rate_high);

    let ratio = null;
    let signal = "informational";
    let recommendation = "No modelled loss available; informational only.";

    if (eal > 0 && (prem_low + prem_high) > 0) {
      const avg_prem = (prem_low + prem_high) / 2;
      ratio = Math.round((eal / avg_prem) * 100) / 100;
      if (ratio >= 2.0) {
        signal = "strong_priority";
        recommendation = `Modelled loss exceeds premium by ~${ratio}x. Priority cover.`;
      } else if (ratio >= 1.0) {
        signal = "worth_considering";
        recommendation = `Modelled loss is ~${ratio}x premium. Worth considering.`;
      } else {
        signal = "likely_not_priority";
        recommendation = `Premium exceeds modelled loss (ratio ${ratio}x). Likely not a priority at your scale.`;
      }
    }

    comparisons.push({
      product_key: key,
      product_name: prod.name,
      recommended_sum_insured_inr: Math.round(totalInsured),
      indicative_premium_low_inr: prem_low,
      indicative_premium_high_inr: prem_high,
      modelled_expected_annual_loss_inr: Math.round(eal),
      loss_to_premium_ratio: ratio,
      decision_signal: signal,
      recommendation: recommendation
    });
  }

  comparisons.sort((a, b) => (b.loss_to_premium_ratio || 0) - (a.loss_to_premium_ratio || 0));

  return {
    business_id: businessId,
    recommended_sum_insured_inr: Math.round(totalInsured),
    comparisons: comparisons,
    disclaimer: "Informational analysis, not IRDAI-regulated advice. Premium rates are indicative market estimates; actual quotes vary."
  };
}

// ---------------------------------------------------------------------------
// Feature 4: Financial Health Scorecard
// ---------------------------------------------------------------------------
function scoreMetric(value, worst, best) {
  if (best === worst) return 50.0;
  const score = 100 * (value - worst) / (best - worst);
  return Math.max(0.0, Math.min(100.0, score));
}

function financialHealth(businessId) {
  const biz = seededBusinesses.find(b => b.id === businessId);
  if (!biz) return null;
  const f = biz.financial;

  // 1. Cash runway (months)
  const runwayMonths = f.avg_monthly_burn_inr > 0 ? f.cash_inr / f.avg_monthly_burn_inr : 0.0;
  const runwayScore = scoreMetric(runwayMonths, 0, 6);

  // 2. Operating margin
  const opMargin = f.revenue_inr > 0 ? (f.revenue_inr - f.cogs_inr - f.opex_inr) / f.revenue_inr : 0.0;
  const marginScore = scoreMetric(opMargin, -0.1, Math.max(f.sector_benchmark_margin * 1.5, 0.2));

  // 3. Working capital cycle (days)
  const wcc = f.dio_days + f.dso_days - f.dpo_days;
  const wccScore = scoreMetric(-wcc, -90, 30);

  // 4. Revenue concentration
  const concScore = scoreMetric(f.top_customer_share, 0.6, 0.1);

  // 5. Debt service coverage
  const dsDenominator = f.interest_inr + f.principal_inr;
  const debtService = dsDenominator > 0 ? f.ebitda_inr / dsDenominator : 5.0;
  const dscrScore = scoreMetric(debtService, 0.8, 3.0);

  const weights = { cash_runway: 0.30, operating_margin: 0.25, working_capital_cycle: 0.15, revenue_concentration: 0.15, debt_service_coverage: 0.15 };

  const metrics = {
    cash_runway: {
      value_months: Math.round(runwayMonths * 100) / 100,
      score: Math.round(runwayScore * 10) / 10,
      weight: weights.cash_runway,
      signal: runwayMonths < 2 ? "critical" : (runwayMonths < 4 ? "weak" : "healthy")
    },
    operating_margin: {
      value: Math.round(opMargin * 10000) / 10000,
      sector_benchmark: f.sector_benchmark_margin,
      score: Math.round(marginScore * 10) / 10,
      weight: weights.operating_margin,
      signal: opMargin < f.sector_benchmark_margin ? "below_benchmark" : "above_benchmark"
    },
    working_capital_cycle: {
      value_days: Math.round(wcc * 10) / 10,
      score: Math.round(wccScore * 10) / 10,
      weight: weights.working_capital_cycle,
      signal: wcc > 45 ? "cash_trapped" : (wcc > 0 ? "normal" : "favourable")
    },
    revenue_concentration: {
      top_customer_share: Math.round(f.top_customer_share * 1000) / 1000,
      score: Math.round(concScore * 10) / 10,
      weight: weights.revenue_concentration,
      signal: f.top_customer_share > 0.4 ? "fragile" : (f.top_customer_share > 0.25 ? "moderate" : "diversified")
    },
    debt_service_coverage: {
      dscr: Math.round(debtService * 100) / 100,
      score: Math.round(dscrScore * 10) / 10,
      weight: weights.debt_service_coverage,
      signal: debtService < 1.25 ? "strained" : (debtService < 1.8 ? "adequate" : "comfortable")
    }
  };

  const overall = metrics.cash_runway.score * weights.cash_runway +
                  metrics.operating_margin.score * weights.operating_margin +
                  metrics.working_capital_cycle.score * weights.working_capital_cycle +
                  metrics.revenue_concentration.score * weights.revenue_concentration +
                  metrics.debt_service_coverage.score * weights.debt_service_coverage;

  const healthBand = overall < 35 ? "critical" : (overall < 55 ? "weak" : (overall < 70 ? "fair" : "healthy"));

  return {
    business_id: businessId,
    overall_score: Math.round(overall * 10) / 10,
    health_band: healthBand,
    metrics: metrics,
    snapshot: {
      cash_inr: f.cash_inr,
      avg_monthly_burn_inr: f.avg_monthly_burn_inr,
      revenue_inr: f.revenue_inr
    }
  };
}

function crossRiskInsight(businessId, hazardType = "flood") {
  const fh = financialHealth(businessId);
  const risk = computeExpectedLoss(businessId, hazardType);
  if (!fh || !risk) return null;

  const runway_months = fh.metrics.cash_runway.value_months;
  const eal = risk.expected_annual_loss_inr;
  const burn = fh.snapshot.avg_monthly_burn_inr;

  const eal_in_months = burn > 0 ? Math.round((eal / burn) * 100) / 100 : 0.0;
  const post_event_runway = Math.round((runway_months - eal_in_months) * 100) / 100;
  const below_zero = post_event_runway <= 0;

  let insight = `Your cash runway is ${runway_months} months. Your modelled ${hazardType} expected annual loss is ₹${eal.toLocaleString('en-IN')}. An uninsured event would consume ~${eal_in_months} months of cash, leaving you at ${post_event_runway} months runway.`;
  if (below_zero) {
    insight += " This would put you below zero — this is the single highest-priority action on your dashboard: insure the flood risk.";
  } else {
    insight += " This is manageable but worth insuring against.";
  }

  return {
    business_id: businessId,
    cash_runway_months: runway_months,
    expected_annual_loss_inr: eal,
    eal_in_months_of_burn: eal_in_months,
    post_event_runway_months: post_event_runway,
    would_go_below_zero: below_zero,
    insight: insight,
    priority: below_zero ? "critical" : "moderate"
  };
}

// ---------------------------------------------------------------------------
// Feature 1: Government Benefit Finder
// ---------------------------------------------------------------------------
function resolveField(biz, field) {
  const parts = field.split('.');
  let val = biz;
  for (const p of parts) {
    if (val && typeof val === 'object') {
      val = val[p];
    } else {
      return undefined;
    }
  }
  return val;
}

function evalRule(biz, rule) {
  const keys = Object.keys(rule);
  const op = keys.find(k => k !== 'field');
  const field = rule.field;
  const val = resolveField(biz, field);

  if (op === 'in') {
    return rule.in.includes(val) ? [true, null] : [false, `${field} is '${val}', not in ${JSON.stringify(rule.in)}`];
  }
  if (op === 'not_in') {
    return !rule.not_in.includes(val) ? [true, null] : [false, `${field} is '${val}', which is excluded`];
  }
  if (op === 'gte') {
    return (val !== undefined && val >= rule.gte) ? [true, null] : [false, `${field} is ${val}, below required ${rule.gte}`];
  }
  if (op === 'lte') {
    return (val !== undefined && val <= rule.lte) ? [true, null] : [false, `${field} is ${val}, above required ${rule.lte}`];
  }
  if (op === 'eq') {
    return val === rule.eq ? [true, null] : [false, `${field} is '${val}', expected '${rule.eq}'`];
  }
  return [false, `Unknown operator ${op}`];
}

function evalGroup(biz, group) {
  const failures = [];
  if (group.all) {
    for (const rule of group.all) {
      const [passed, reason] = evalRule(biz, rule);
      if (!passed) failures.push(reason);
    }
    return [failures.length === 0, failures];
  }
  if (group.any) {
    let anyPassed = false;
    for (const rule of group.any) {
      const [passed] = evalRule(biz, rule);
      if (passed) {
        anyPassed = true;
        break;
      }
    }
    if (!anyPassed) failures.push("None of the alternative conditions were met");
    return [anyPassed, failures];
  }
  return [true, []];
}

function checkEligibility(businessId) {
  const biz = seededBusinesses.find(b => b.id === businessId);
  if (!biz) return null;

  // Add mock category placeholder
  const biz_dict = { ...biz, owner_category: "woman" };

  const eligible = [];
  const likely = [];
  const not_eligible = [];

  SCHEMES.forEach(scheme => {
    const rules = scheme.eligibility || { all: [] };
    const [passed, failures] = evalGroup(biz_dict, rules);
    const entry = {
      scheme_id: scheme.scheme_id,
      name: scheme.name,
      ministry: scheme.ministry,
      summary: scheme.summary,
      benefit: scheme.benefit,
      confidence: scheme.confidence,
      source_url: scheme.source_url,
      documents: scheme.documents || [],
      how_to_apply: scheme.how_to_apply || ""
    };

    if (passed) {
      if (scheme.confidence === 'likely') {
        entry.tier = "likely_eligible";
        entry.verify_note = "Eligibility rules pass but owner category was assumed; verify details.";
        likely.push(entry);
      } else {
        entry.tier = "eligible";
        eligible.push(entry);
      }
    } else {
      entry.tier = "not_eligible";
      entry.reasons = failures;
      not_eligible.push(entry);
    }
  });

  return {
    business_id: businessId,
    udyam_category: biz.udyam_category,
    eligible: eligible,
    likely_eligible: likely,
    not_eligible: not_eligible,
    disclaimer: "Eligibility calculations are indicative. Verify details before application.",
    total_schemes_evaluated: SCHEMES.length
  };
}

// ---------------------------------------------------------------------------
// Feature 8: Compliance & Renewal Tracker
// ---------------------------------------------------------------------------
function getComplianceCalendar(businessId) {
  const biz = seededBusinesses.find(b => b.id === businessId);
  if (!biz) return null;

  const offsets = DUE_DATE_OFFSETS[businessId] || { gst_q1: 15, gst_q2: 45, insurance_renewal: 20, loan_emi: 5 };
  const items = [];
  let overdueCount = 0;
  let criticalCount = 0;

  COMPLIANCE_TEMPLATES.forEach(tmpl => {
    const offsetDays = offsets[tmpl.id] !== undefined ? offsets[tmpl.id] : 30;
    const due = new Date(TODAY);
    due.setDate(due.getDate() + offsetDays);

    const diffTime = due.getTime() - TODAY.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let urgency = "upcoming";
    if (days < 0) urgency = "overdue";
    else if (days <= 7) urgency = "critical";
    else if (days <= 30) urgency = "warning";

    items.push({
      id: tmpl.id,
      category: tmpl.category,
      title: tmpl.title,
      description: tmpl.description,
      frequency: tmpl.frequency,
      authority: tmpl.authority,
      penalty: tmpl.penalty,
      due_date: due.toISOString().split('T')[0],
      days_until_due: days,
      urgency: urgency
    });

    if (urgency === "overdue") overdueCount++;
    else if (urgency === "critical") criticalCount++;
  });

  items.sort((a, b) => a.days_until_due - b.days_until_due);

  let insight = "No upcoming deadlines.";
  if (overdueCount > 0) {
    insight = `${overdueCount} item(s) are overdue — resolve immediately to avoid penalties.`;
  } else if (criticalCount > 0) {
    insight = `${criticalCount} item(s) due within 7 days.`;
  } else if (items.length > 0) {
    insight = `Next deadline: ${items[0].title} in ${items[0].days_until_due} days.`;
  }

  return {
    business_id: businessId,
    today: TODAY.toISOString().split('T')[0],
    items: items,
    summary: {
      overdue: overdueCount,
      critical: criticalCount,
      warning: items.filter(i => i.urgency === "warning").length,
      upcoming: items.filter(i => i.urgency === "upcoming").length
    },
    insight: insight,
    priority: overdueCount > 0 ? "critical" : (criticalCount > 0 ? "high" : "normal")
  };
}

// ---------------------------------------------------------------------------
// Feature 9: Supply Chain Risk Alert
// ---------------------------------------------------------------------------
function getSupplyChainRisk(businessId) {
  const biz = seededBusinesses.find(b => b.id === businessId);
  if (!biz) return null;

  let templates = SUPPLY_CHAIN_TEMPLATES;
  let regionalRisk = REGIONAL_RISK;

  if (biz.business_category.includes("electronics")) {
    templates = [
      { id: "supplier_electronics_asia", supplier_name: "Shenzhen Electronics Hub", material: "Consumer electronics components", region: "Shenzhen, China", region_lat: 22.5431, region_lng: 114.0579, share_of_supply: 0.80, lead_time_days: 25, reorder_point_days: 35 },
      { id: "supplier_packaging_mumbai", supplier_name: "Mumbai Packaging Co.", material: "Packaging and accessories", region: "Mumbai, Maharashtra", region_lat: 19.0760, region_lng: 72.8777, share_of_supply: 0.20, lead_time_days: 3, reorder_point_days: 7 }
    ];
    regionalRisk = {
      ...REGIONAL_RISK,
      "Shenzhen, China": { flood_risk: 0.30, cyclone_risk: 0.35, transport_disruption: 0.40, political_risk: 0.25 }
    };
  } else if (!biz.business_category.includes("textile")) {
    // Other categories take packaging and small local suppliers
    templates = [SUPPLY_CHAIN_TEMPLATES[2]];
  }

  const suppliers = [];

  templates.forEach(tmpl => {
    const risks = regionalRisk[tmpl.region] || { flood_risk: 0.2, cyclone_risk: 0.1, transport_disruption: 0.2, political_risk: 0.05 };
    const composite = risks.flood_risk * 0.35 +
                      risks.cyclone_risk * 0.20 +
                      risks.transport_disruption * 0.30 +
                      risks.political_risk * 0.15;

    const bufferDays = Math.round(tmpl.lead_time_days * composite);
    const inventoryDays = tmpl.reorder_point_days - tmpl.lead_time_days;
    const atRisk = composite > 0.4 || inventoryDays < bufferDays;

    const recommendations = [];
    if (risks.flood_risk > 0.5) {
      recommendations.push(`High flood risk in ${tmpl.region}. Pre-position ${Math.round(bufferDays * 1.5)} days of safety stock before monsoons.`);
    }
    if (risks.transport_disruption > 0.4) {
      recommendations.push(`Transport disruptions likely in ${tmpl.region}. Identify a secondary regional supplier.`);
    }
    if (tmpl.share_of_supply > 0.6) {
      recommendations.push(`Single-supplier concentration risk (${Math.round(tmpl.share_of_supply * 100)}%). Diversify sourcing to mitigate risks.`);
    }
    if (composite > 0.4 && recommendations.length === 0) {
      recommendations.push(`Elevated risk index. Increase inventory buffer by ${bufferDays} days.`);
    }
    if (recommendations.length === 0) {
      recommendations.push("Risk indices within acceptable thresholds.");
    }

    suppliers.push({
      id: tmpl.id,
      supplier_name: tmpl.supplier_name,
      material: tmpl.material,
      region: tmpl.region,
      share_of_supply: tmpl.share_of_supply,
      lead_time_days: tmpl.lead_time_days,
      reorder_point_days: tmpl.reorder_point_days,
      risk_factors: risks,
      composite_risk: Math.round(composite * 1000) / 1000,
      buffer_days_needed: bufferDays,
      inventory_buffer_days: inventoryDays,
      at_risk: atRisk,
      recommendations: recommendations
    });
  });

  suppliers.sort((a, b) => b.composite_risk - a.composite_risk);
  const overallRisk = Math.round(suppliers.reduce((sum, s) => sum + s.composite_risk * s.share_of_supply, 0) * 100) / 100;
  const riskBand = overallRisk > 0.5 ? "high" : (overallRisk > 0.3 ? "moderate" : "low");
  const atRiskCount = suppliers.filter(s => s.at_risk).length;

  return {
    business_id: businessId,
    suppliers: suppliers,
    overall_risk_score: overallRisk,
    risk_band: riskBand,
    at_risk_supplier_count: atRiskCount,
    insight: atRiskCount > 0 ?
      `Overall supply chain risk is ${riskBand} (${Math.round(overallRisk * 100)}%). ${atRiskCount} supplier(s) require intervention. Focus on inventory pre-positioning.` :
      `Overall supply chain risk is ${riskBand} (${Math.round(overallRisk * 100)}%). All suppliers are stable.`
  };
}

// ---------------------------------------------------------------------------
// Feature 10: Emergency Support
// ---------------------------------------------------------------------------
function getEmergencySupport(businessId, disasterType = "flood") {
  const biz = seededBusinesses.find(b => b.id === businessId);
  if (!biz) return null;

  const playbook = DISASTER_PLAYBOOKS[disasterType];
  if (!playbook) return null;

  // find insurance policies
  const advisor = insuranceAdvisor(businessId);
  const relevant_policies = [];
  advisor.comparisons.forEach(c => {
    if (disasterType === "flood" && (c.product_key === "flood" || c.product_key === "shopkeepers")) {
      relevant_policies.push(c.product_name);
    } else if (disasterType === "fire" && (c.product_key === "fire" || c.product_key === "shopkeepers")) {
      relevant_policies.push(c.product_name);
    } else if (c.product_key === "shopkeepers") {
      relevant_policies.push(c.product_name);
    }
  });

  return {
    business_id: businessId,
    business_name: biz.name,
    disaster_type: disasterType,
    severity_levels: playbook.severity_levels,
    immediate_actions: playbook.immediate_actions,
    insurance_guidance: playbook.insurance_guidance,
    relevant_insurance_policies: relevant_policies,
    government_assistance: playbook.government_assistance,
    helpline_numbers: playbook.helpline_numbers,
    recommended_sum_insured_inr: advisor.recommended_sum_insured_inr,
    critical_note: `Your expected annual flood loss is part of your risk profile. Keep all damage documentation (photos, bills) ready for insurance claims and government relief.`,
    disclaimer: "Prioritise life safety and follow local evacuation orders. This information is illustrative."
  };
}

// ---------------------------------------------------------------------------
// Feature 7: Weather Intelligence Engine
// ---------------------------------------------------------------------------
function getSeededWeather(businessId, dayOffset) {
  let hashVal = 0;
  const str = `${businessId}:${dayOffset}`;
  for (let i = 0; i < str.length; i++) {
    hashVal = (hashVal << 5) - hashVal + str.charCodeAt(i);
    hashVal |= 0;
  }
  // LCG randomiser
  const rng = createRandom(Math.abs(hashVal));

  const conditions = [
    { key: "clear", label: "Clear sky", icon: "☀️", temp: [28, 38], hum: [35, 55], risk: "low", loss: 0 },
    { key: "partly_cloudy", label: "Partly cloudy", icon: "⛅", temp: [26, 34], hum: [45, 65], risk: "low", loss: 0 },
    { key: "cloudy", label: "Overcast", icon: "☁️", temp: [24, 30], hum: [60, 80], risk: "low", loss: 0 },
    { key: "light_rain", label: "Light rain", icon: "🌦️", temp: [23, 28], hum: [70, 85], risk: "moderate", loss: 1500 },
    { key: "heavy_rain", label: "Heavy rain", icon: "🌧️", temp: [22, 27], hum: [80, 95], risk: "high", loss: 8000 },
    { key: "thunderstorm", label: "Thunderstorm", icon: "⛈️", temp: [22, 28], hum: [85, 98], risk: "high", loss: 6000 },
    { key: "heatwave", label: "Heatwave", icon: "🥵", temp: [38, 45], hum: [30, 50], risk: "high", loss: 3000 },
    { key: "windy", label: "Windy", icon: "💨", temp: [25, 32], hum: [40, 60], risk: "moderate", loss: 500 }
  ];

  // July is monsoon season in India
  const weights = [1, 2, 3, 4, 3, 2, 0, 1]; // monsoon biases
  const total = weights.reduce((a, b) => a + b, 0);
  const r = rng() * total;

  let cumulative = 0;
  let picked = conditions[0];
  for (let i = 0; i < conditions.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) {
      picked = conditions[i];
      break;
    }
  }

  const temp = Math.round((picked.temp[0] + rng() * (picked.temp[1] - picked.temp[0])) * 10) / 10;
  const humidity = Math.round((picked.hum[0] + rng() * (picked.hum[1] - picked.hum[0])) * 10) / 10;
  const wind = Math.round((3 + rng() * 22) * 10) / 10;

  return {
    condition: picked,
    temp,
    humidity,
    wind
  };
}

function getWeatherIntelligence(businessId, days = 7) {
  const biz = seededBusinesses.find(b => b.id === businessId);
  if (!biz) return null;

  const forecast = [];
  const highRiskDays = [];

  for (let offset = 0; offset < days; offset++) {
    const d = new Date(TODAY);
    d.setDate(d.getDate() + offset);

    const weatherData = getSeededWeather(businessId, offset);
    const cond = weatherData.condition;

    // industry specific advisory
    let advisories = [
      "Monitor local weather alerts and keep emergency supplies ready.",
      "Check storage rooms for dampness or water leakage."
    ];

    if (cond.key === "heavy_rain") {
      advisories = [
        "Move ground-floor inventory and retail displays to higher shelves.",
        "Check window seals and protect critical paper/electronic ledgers.",
        "Expect low customer footfall; focus on digital payments or home deliveries."
      ];
    } else if (cond.key === "thunderstorm") {
      advisories = [
        "Unplug primary computer terminals and inventory hardware.",
        "Secure outdoor billboards and storefront frames.",
        "Verify backup lights are fully charged."
      ];
    } else if (cond.key === "heatwave") {
      advisories = [
        "Increase refrigeration levels for perishables.",
        "Stagger delivery activities to avoid peak afternoon heat (12 PM - 3 PM).",
        "Keep walk-in customer zones cooled to optimize shopping dwell times."
      ];
    } else if (cond.key === "clear" || cond.key === "partly_cloudy") {
      advisories = [
        "Excellent window for high street retail walk-ins.",
        "Conduct inventory restock shipments and supplier collections."
      ];
    }

    const dayData = {
      date: d.toISOString().split('T')[0],
      day_name: d.toLocaleDateString('en-US', { weekday: 'long' }),
      condition: cond.key,
      condition_label: cond.label,
      icon: cond.icon,
      temp_c: weatherData.temp,
      humidity_pct: weatherData.humidity,
      wind_kmph: weatherData.wind,
      risk_level: cond.risk,
      advisories: advisories,
      financial_impact: {
        footfall_change: cond.key === "heavy_rain" ? -0.35 : (cond.key === "thunderstorm" ? -0.45 : (cond.key === "heatwave" ? -0.20 : 0.05)),
        estimated_daily_loss_inr: cond.loss
      }
    };

    forecast.push(dayData);
    if (cond.risk === "high") {
      highRiskDays.push(dayData);
    }
  }

  const current = forecast[0];
  const highRiskCount = highRiskDays.length;
  let overallRisk = "low";
  let overallSummary = "Ideal weather expected. Smooth operations ahead.";

  if (highRiskCount >= 3) {
    overallRisk = "high";
    overallSummary = `Severe weather advisory: ${highRiskCount} high-risk weather alerts this week. Move stock to safe elevations.`;
  } else if (highRiskCount >= 1) {
    overallRisk = "moderate";
    overallSummary = `Weather warning: ${highRiskCount} high-risk event(s) forecasted this week. Stay alert and follow advisories.`;
  }

  const estWeeklyImpact = forecast.reduce((sum, d) => sum + d.financial_impact.estimated_daily_loss_inr, 0);

  return {
    business_id: businessId,
    business_name: biz.name,
    location: biz.state,
    generated_at: TODAY.toISOString().split('T')[0],
    current: current,
    forecast: forecast,
    overall_risk: overallRisk,
    overall_summary: overallSummary,
    high_risk_days: highRiskCount,
    estimated_weekly_impact_inr: estWeeklyImpact,
    top_recommendations: forecast.filter(d => d.risk_level === 'high' || d.risk_level === 'moderate')
                                  .flatMap(d => d.advisories).slice(0, 5)
  };
}

// ---------------------------------------------------------------------------
// Combined Analysis Engine
// ---------------------------------------------------------------------------
function analyzeBusiness(businessId) {
  const biz = seededBusinesses.find(b => b.id === businessId);
  if (!biz) return null;

  const market = computeMarketIntelligence(businessId);
  const risk = computeExpectedLoss(businessId, "flood");
  const insurance = insuranceAdvisor(businessId);
  const financial = financialHealth(businessId);
  const cross = crossRiskInsight(businessId, "flood");
  const compliance = getComplianceCalendar(businessId);
  const supply = getSupplyChainRisk(businessId);
  const weather = getWeatherIntelligence(businessId);
  const emergency = getEmergencySupport(businessId, "flood");
  const schemes = checkEligibility(businessId);

  return {
    business: biz,
    market_intelligence: market,
    expected_loss: risk,
    insurance_recommendations: insurance,
    financial_health: financial,
    cross_risk: cross,
    compliance: compliance,
    supply_chain: supply,
    weather: weather,
    emergency: emergency,
    government_schemes: schemes
  };
}

module.exports = {
  seededBusinesses,
  registerBusiness,
  computeMarketIntelligence,
  computeExpectedLoss,
  insuranceAdvisor,
  financialHealth,
  crossRiskInsight,
  checkEligibility,
  getComplianceCalendar,
  getSupplyChainRisk,
  getEmergencySupport,
  getWeatherIntelligence,
  analyzeBusiness
};
