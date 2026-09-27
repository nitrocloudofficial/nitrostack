import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class AetherCareResources {

  @Resource({
    uri: 'aethercare://schemes/pmjay_master',
    name: 'Ayushman Bharat PM-JAY Guidelines & Policy Rules',
    description: 'Structured reference document for entitlement rules, cashless package limits, and family card verification.',
    mimeType: 'application/json'
  })
  async getPmjayGuidelines(ctx: ExecutionContext) {
    ctx.logger.info('Fetching PM-JAY guidelines resource');

    return {
      schemeName: 'Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (PM-JAY)',
      authority: 'National Health Authority (NHA), Ministry of Health & Family Welfare',
      financialCap: '₹5,00,000 per family per year on a family floater basis',
      cashlessGuarantee: '100% cashless treatment at empanelled public and private hospitals',
      keyCoverageItems: [
        'Pre-hospitalization diagnostics up to 3 days prior',
        'Post-hospitalization medicine and follow-up care up to 15 days',
        'Surgical packages including implants and ICU stay',
        'No upper limit on family size or age'
      ],
      grievanceHelpline: '14555 / 1800-111-555'
    };
  }

  @Resource({
    uri: 'aethercare://regulations/price_caps',
    name: 'NPPA & NHA Medical Device & Package Ceiling Prices',
    description: 'Central registry of maximum ceiling prices for coronary stents, knee implants, and daily ICU charges.',
    mimeType: 'application/json'
  })
  async getPriceCapsRegistry(ctx: ExecutionContext) {
    ctx.logger.info('Fetching price caps registry resource');

    return {
      registryTitle: 'National Drug & Medical Device Price Control Registry',
      governingAct: 'Drugs (Prices Control) Order, 2013 under Essential Commodities Act',
      stentCeilings: {
        bareMetalStentINR: 10500,
        drugElutingStentINR: 38260,
        note: 'Prices inclusive of local taxes/GST. Separate billing above ceiling is strictly illegal.'
      },
      orthopedicCeilings: {
        kneeReplacementCobaltChromiumINR: 64180,
        specializedTitaniumOptionINR: 78500
      },
      hospitalICUCeilings: {
        pmjayIcuPerDayINR: 4500,
        cghsIcuPerDayINR: 5200
      }
    };
  }

  @Resource({
    uri: 'aethercare://regulations/nlem_essential_medicines',
    name: 'National List of Essential Medicines (NLEM 2026) Price Registry',
    description: 'Statutory ceiling price registry for 380+ essential life-saving drugs under NPPA DPCO.',
    mimeType: 'application/json'
  })
  async getNlemEssentialMedicines(ctx: ExecutionContext) {
    ctx.logger.info('Fetching NLEM Essential Medicines resource');

    return {
      registryTitle: 'National List of Essential Medicines (NLEM 2026)',
      authority: 'National Pharmaceutical Pricing Authority (NPPA)',
      regulatedCategoriesCount: 388,
      keyPriceCeilings: {
        paracetamol650mg: '₹2.15 per tablet',
        insulinHuman10ml: '₹145.50 per 10ml vial',
        atorvastatin10mg: '₹4.80 per tablet',
        azithromycin500mg: '₹23.40 per tablet',
        pantoprazole40mg: '₹7.90 per tablet'
      },
      legalRights: 'Pharmacies charging above NLEM maximum retail price commit DPCO offenses subject to license revocation.'
    };
  }

  @Resource({
    uri: 'aethercare://rights/patient_charter',
    name: 'Ministry of Health Patient Rights Charter',
    description: 'National Human Rights Commission (NHRC) and MoHFW 17 inviolable patient consumer rights.',
    mimeType: 'application/json'
  })
  async getPatientCharter(ctx: ExecutionContext) {
    ctx.logger.info('Fetching Patient Charter resource');

    return {
      charterTitle: 'Charter of Patients Rights & Responsibilities',
      authority: 'Ministry of Health & Family Welfare & NHRC India',
      inviolableRights: [
        'Right to Right to Information on itemized bill estimate before procedure',
        'Right to Emergency Medical Care without mandatory upfront cash deposit',
        'Right to Second Opinion & Discharge Summary within 24 hours',
        'Right to Cashless Service under government entitlement schemes',
        'Right to Confidentiality & Human Dignity'
      ]
    };
  }

  @Resource({
    uri: 'aethercare://guidelines/ayushman_mitra_counter',
    name: 'Hospital Ayushman Mitra Desk Standard Operating Procedure',
    description: 'Standard Operating Procedure (SOP) for Ayushman Mitra helpdesks inside empaneled hospitals.',
    mimeType: 'application/json'
  })
  async getAyushmanMitraSop(ctx: ExecutionContext) {
    ctx.logger.info('Fetching Ayushman Mitra SOP resource');

    return {
      helpdeskTitle: 'Ayushman Mitra Kiosk Operating Procedure',
      responsibilities: [
        'Biometric authentication of Aadhaar & Golden Card',
        'Electronic generation of TMS Pre-Authorization Requisition',
        'Providing 100% cashless admission pass to patient relative',
        'Resolving billing discrepancies prior to patient discharge'
      ]
    };
  }
}
