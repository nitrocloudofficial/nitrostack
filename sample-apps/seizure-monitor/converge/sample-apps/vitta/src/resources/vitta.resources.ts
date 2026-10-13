/**
 * vitta.resources.ts — the 5 MCP Resources (data the agent reads).
 * policy / product catalog / city-tiers / consent-templates / live case record.
 */
import { ResourceDecorator as Resource, ControllerDecorator as Controller, ExecutionContext } from '@nitrostack/core';
import { POLICY, REASON_TEXT } from '../lib/policy.js';
import { allSeeds } from '../lib/seeds.js';
import { store } from '../lib/store.js';
import { maskPan, maskMobile, maskName } from '../lib/redact.js';

function json(uri: string, data: unknown) {
  return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) }] };
}

@Controller()
export class VittaResources {
  @Resource({
    uri: 'policy://credit-policy/v1.7',
    name: 'Credit Policy v1.7',
    description: 'Eligibility rules, FOIR cap, hard negatives, score bands and rate bands. The same rules underwrite() enforces.',
    mimeType: 'application/json',
  })
  async creditPolicy(uri: string, _ctx: ExecutionContext) {
    return json(uri, {
      version: POLICY.version,
      eligibility: {
        age_band: '21–60',
        employment: POLICY.eligible_employment,
        min_bureau_score: POLICY.min_bureau_score,
        max_dpd_12m: POLICY.max_dpd_12m,
        max_inquiries_6m: POLICY.max_inquiries_6m,
        foir_cap: POLICY.foir_cap,
      },
      score_bands: POLICY.score_bands,
      rate_bands: POLICY.rate_bands,
      reason_code_glossary: REASON_TEXT,
      note: 'RBI/KYC master-direction alignment (mock corpus). Rules editable here; underwrite() reads the same constants.',
    });
  }

  @Resource({
    uri: 'catalog://products/personal-loan',
    name: 'Personal Loan Catalog',
    description: 'Product, ROI bands, processing fee and tenure grid.',
    mimeType: 'application/json',
  })
  async productCatalog(uri: string, _ctx: ExecutionContext) {
    return json(uri, {
      product: 'Vitta Personal Loan',
      roi_bands: POLICY.rate_bands,
      processing_fee_pct: POLICY.processing_fee_pct,
      tenure_grid_months: [12, 24, 36, 48],
      amount_range: { min: POLICY.min_amount, max: 1500000 },
      incentives: { autopay_discount_pct: 0.25, existing_customer_fee_waiver_pct: 0.5 },
    });
  }

  @Resource({
    uri: 'ref://city-tiers',
    name: 'City Tiers',
    description: 'Served cities and their tier → segment cap.',
    mimeType: 'application/json',
  })
  async cityTiers(uri: string, _ctx: ExecutionContext) {
    return json(uri, { cities: allSeeds().city.cities });
  }

  @Resource({
    uri: 'consent://templates',
    name: 'Consent Templates',
    description: 'Versioned DPDP consent text registry — the exact language + version presented to applicants.',
    mimeType: 'application/json',
  })
  async consentTemplates(uri: string, _ctx: ExecutionContext) {
    return json(uri, {
      current_version: 'consent-v3',
      templates: {
        'consent-v3': {
          scopes: ['CREDIT_BUREAU', 'BANK_STATEMENTS', 'KYC'],
          ttl_seconds: 900,
          text:
            'I authorise Vitta to access my credit bureau report, 12 months of bank statements (via Account Aggregator), ' +
            'and CKYC/PAN records solely to assess this loan application. This consent is scoped, expires in 15 minutes, ' +
            'and I may withdraw it at any time. I understand what will and will NOT be accessed.',
          will_not_access: ['Aadhaar number', 'Social media', 'Location', 'Contacts'],
        },
      },
    });
  }

  @Resource({
    uri: 'case://{lead_id}',
    name: 'Live Case Record',
    description: 'The live application record for a lead_id (state the client reads to reason). PII is masked. URI: case://<lead_id>.',
    mimeType: 'application/json',
  })
  async caseRecord(uri: string, _ctx: ExecutionContext) {
    const lead_id = uri.replace(/^case:\/\//, '').split('/')[0];
    const rec = store.getCase(lead_id);
    if (!rec) return json(uri, { lead_id, found: false });
    // mask PII for the read view
    const safe = {
      ...rec,
      pan: rec.pan ? maskPan(rec.pan) : undefined,
      mobile: rec.mobile ? maskMobile(rec.mobile) : undefined,
      name: rec.name ? maskName(rec.name) : undefined,
    };
    return json(uri, { found: true, case: safe });
  }
}
