import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { loadJSON, getResourcePath } from '../../shared/resource-loader.js';
import type {
  PatientDB,
  PharmacogenomicsDB,
  CounterfeitBatch,
  AuthenticityStatus,
  ConfidenceLevel
} from '../../shared/shared.types.js';

// ---------------------------------------------------------------------------
// Helper: fetch with AbortController timeout
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string, timeoutMs: number = 7000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// MedicationTools — Agent 2: Medication Safety & Authenticity
// ---------------------------------------------------------------------------

export class MedicationTools {

  // -------------------------------------------------------------------------
  // Tool 1: check_drug_safety
  // -------------------------------------------------------------------------

  @Tool({
    name: 'check_drug_safety',
    description:
      'Cross-references a medication against a patient\'s genetic markers and active prescriptions to identify gene-drug conflicts, drug-drug interactions, and safety risks. Returns a structured safety report.',
    inputSchema: z.object({
      medication: z.string().describe('Name of the medication to check (generic or brand name)'),
      patient_id: z.string().describe('Patient ID from the family profile (e.g., P001, P002, P003)')
    }),
    examples: {
      request: { medication: 'Warfarin', patient_id: 'P001' },
      response: {
        patient_id: 'P001',
        patient_name: 'Arthur Krishnamurthy',
        medication: 'Warfarin',
        gene_risk_flags: [],
        drug_interactions: [],
        overall_risk: 'low',
        warnings: []
      }
    }
  })
  @Widget('drug-safety')
  async checkDrugSafety(input: { medication: string; patient_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Checking drug safety', { medication: input.medication, patient_id: input.patient_id });

    // --- Load patient profile ---
    const patientDB = loadJSON<PatientDB>('patient_profile.json', 'patient profiles');

    const patient = patientDB.patients.find(p => p.patient_id === input.patient_id);
    if (!patient) {
      throw new Error(`Patient with ID "${input.patient_id}" not found. Available IDs: P001, P002, P003`);
    }

    // --- Load pharmacogenomics DB ---
    const pgxDB = loadJSON<PharmacogenomicsDB>('pharmacogenomics_db.json', 'pharmacogenomics database');

    const medicationNormalized = input.medication.toLowerCase().trim();
    const geneRiskFlags: Array<{
      gene: string;
      phenotype: string;
      severity: string;
      risk: string;
      recommendation: string;
      fda_boxed_warning: boolean;
    }> = [];

    // --- Check gene-drug conflicts ---
    for (const markerEntry of patient.genetic_markers) {
      const geneData = pgxDB.markers[markerEntry.gene];
      if (!geneData) continue;

      const variantData = geneData.variants[markerEntry.variant];
      if (!variantData) continue;

      for (const conflict of variantData.conflicts) {
        if (conflict.drug.toLowerCase() === medicationNormalized) {
          geneRiskFlags.push({
            gene: markerEntry.gene,
            phenotype: markerEntry.phenotype,
            severity: conflict.severity,
            risk: conflict.risk,
            recommendation: conflict.recommendation,
            fda_boxed_warning: conflict.fda_boxed_warning
          });
        }
      }
    }

    // --- Check drug-drug interactions (duplicate / conflicting in active meds) ---
    const drugInteractions: Array<{
      interacting_drug: string;
      description: string;
      severity: string;
    }> = [];

    const knownInteractions: Record<string, Array<{ drug: string; description: string; severity: string }>> = {
      warfarin: [
        { drug: 'aspirin', description: 'Concurrent use significantly increases bleeding risk. Both inhibit clotting by different mechanisms.', severity: 'high' },
        { drug: 'metformin', description: 'Minor interaction. Metformin may slightly enhance anticoagulant effect of Warfarin.', severity: 'low' }
      ],
      levothyroxine: [
        { drug: 'metformin', description: 'Metformin may reduce levothyroxine absorption. Administer at least 4 hours apart.', severity: 'moderate' },
        { drug: 'salbutamol', description: 'Salbutamol can increase heart rate; combined with levothyroxine-induced tachycardia, monitor cardiac status.', severity: 'low' }
      ],
      metformin: [
        { drug: 'contrast media', description: 'Hold metformin 48h before iodinated contrast administration to prevent lactic acidosis.', severity: 'high' }
      ]
    };

    const activeMedNames = patient.active_medications.map(m => m.name.toLowerCase());
    const interactions = knownInteractions[medicationNormalized] || [];

    for (const interaction of interactions) {
      if (activeMedNames.includes(interaction.drug.toLowerCase())) {
        drugInteractions.push({
          interacting_drug: interaction.drug,
          description: interaction.description,
          severity: interaction.severity
        });
      }
    }

    // Also check if the medication is already prescribed (duplicate)
    const alreadyPrescribed = activeMedNames.includes(medicationNormalized);
    if (alreadyPrescribed) {
      drugInteractions.push({
        interacting_drug: input.medication,
        description: `${input.medication} is already in this patient's active prescriptions. Verify with prescribing physician before adding a duplicate.`,
        severity: 'moderate'
      });
    }

    // --- Compute overall risk ---
    const allSeverities = [
      ...geneRiskFlags.map(f => f.severity),
      ...drugInteractions.map(i => i.severity)
    ];

    let overallRisk: 'high' | 'moderate' | 'low' | 'none' = 'none';
    if (allSeverities.includes('high')) overallRisk = 'high';
    else if (allSeverities.includes('moderate')) overallRisk = 'moderate';
    else if (allSeverities.includes('low')) overallRisk = 'low';

    // --- Warnings ---
    const warnings: string[] = [];
    if (geneRiskFlags.some(f => f.fda_boxed_warning)) {
      warnings.push('⚠️ FDA BLACK BOX WARNING: This drug-gene combination carries an FDA boxed warning. Consult physician immediately.');
    }
    if (overallRisk === 'high') {
      warnings.push('🚨 HIGH RISK: One or more high-severity interactions detected. This medication requires immediate clinical review before use.');
    }
    if (patient.allergies?.some(a => a.substance.toLowerCase().includes(medicationNormalized))) {
      warnings.push(`🚫 ALLERGY ALERT: Patient has a documented allergy to ${input.medication} or a related substance.`);
    }

    ctx.logger.info('Drug safety check complete', {
      gene_flags: geneRiskFlags.length,
      interactions: drugInteractions.length,
      overall_risk: overallRisk
    });

    return {
      patient_id: patient.patient_id,
      patient_name: patient.name,
      medication: input.medication,
      gene_risk_flags: geneRiskFlags,
      drug_interactions: drugInteractions,
      overall_risk: overallRisk,
      warnings,
      active_medications_count: patient.active_medications.length,
      genetic_markers_checked: patient.genetic_markers.map(m => m.gene),
      checked_at: new Date().toISOString()
    };
  }

  // -------------------------------------------------------------------------
  // Tool 2: lookup_drug_label
  // -------------------------------------------------------------------------

  @Tool({
    name: 'lookup_drug_label',
    description:
      'Fetches official FDA drug label information for a given drug name, including warnings, contraindications, boxed warnings, and drug interaction text from the openFDA Drug Label API.',
    inputSchema: z.object({
      drug_name: z.string().describe('The drug name to look up (brand or generic)')
    }),
    examples: {
      request: { drug_name: 'Warfarin' },
      response: {
        drug_name: 'Warfarin',
        brand_names: [],
        generic_names: [],
        manufacturer: '',
        warnings: '',
        boxed_warning: '',
        contraindications: '',
        drug_interactions: '',
        source: 'openFDA'
      }
    }
  })
  async lookupDrugLabel(input: { drug_name: string }, ctx: ExecutionContext) {
    ctx.logger.info('Looking up drug label', { drug_name: input.drug_name });

    const encodedName = encodeURIComponent(`"${input.drug_name}"`);
    const urls = [
      `https://api.fda.gov/drug/label.json?search=openfda.brand_name:${encodedName}&limit=1`,
      `https://api.fda.gov/drug/label.json?search=openfda.generic_name:${encodedName}&limit=1`
    ];

    let labelData: Record<string, unknown> | null = null;
    let usedUrl = '';

    for (const url of urls) {
      try {
        const response = await fetchWithTimeout(url, 7000);
        if (response.ok) {
          const json = await response.json() as { results?: unknown[] };
          if (json.results && json.results.length > 0) {
            labelData = json.results[0] as Record<string, unknown>;
            usedUrl = url;
            break;
          }
        }
        // 404 is expected when name doesn't match — fall through to next URL
        if (response.status !== 404) {
          ctx.logger.warn('Unexpected openFDA status', { status: response.status, url });
        }
      } catch (err) {
        const isTimeout = err instanceof Error && err.name === 'AbortError';
        if (isTimeout) {
          ctx.logger.error('openFDA label lookup timed out', { url });
          throw new Error(`Drug label lookup timed out after 7 seconds for "${input.drug_name}". Please retry.`);
        }
        ctx.logger.error('openFDA label fetch error', { url, error: err instanceof Error ? err.message : String(err) });
        throw new Error(`Network error fetching drug label for "${input.drug_name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (!labelData) {
      return {
        drug_name: input.drug_name,
        found: false,
        message: `No FDA label found for "${input.drug_name}". The drug may be known under a different name or may not be listed in the openFDA database.`,
        source: 'openFDA'
      };
    }

    // Extract openFDA metadata
    const openfda = (labelData.openfda as Record<string, string[]>) || {};
    const firstText = (arr: unknown): string => {
      if (Array.isArray(arr) && arr.length > 0) return String(arr[0]);
      return '';
    };

    ctx.logger.info('Drug label fetched successfully', { drug_name: input.drug_name, url: usedUrl });

    return {
      drug_name: input.drug_name,
      found: true,
      brand_names: openfda.brand_name || [],
      generic_names: openfda.generic_name || [],
      manufacturer: firstText(openfda.manufacturer_name),
      product_type: firstText(openfda.product_type),
      route: openfda.route || [],
      boxed_warning: firstText((labelData as Record<string, unknown>).boxed_warning),
      warnings: firstText((labelData as Record<string, unknown>).warnings),
      warnings_and_cautions: firstText((labelData as Record<string, unknown>).warnings_and_cautions),
      contraindications: firstText((labelData as Record<string, unknown>).contraindications),
      drug_interactions: firstText((labelData as Record<string, unknown>).drug_interactions),
      adverse_reactions: firstText((labelData as Record<string, unknown>).adverse_reactions),
      indications_and_usage: firstText((labelData as Record<string, unknown>).indications_and_usage),
      dosage_and_administration: firstText((labelData as Record<string, unknown>).dosage_and_administration),
      source: 'openFDA',
      api_url: usedUrl
    };
  }

  // -------------------------------------------------------------------------
  // Tool 3: verify_medication_authenticity
  // -------------------------------------------------------------------------

  @Tool({
    name: 'verify_medication_authenticity',
    description:
      'Software registry verification of a medication\'s authenticity via the openFDA NDC directory, recall enforcement database, and internal counterfeit batch registry. Returns a structured authenticity report with status and confidence level. Note: This is a software registry check only — not a physical or image-based inspection.',
    inputSchema: z.object({
      drug_name: z.string().describe('The name of the drug to verify (generic or brand name)'),
      ndc_code: z.string().optional().describe('Optional: 10-digit NDC code (e.g., "0093-1075-01") for precise lookup'),
      batch_number: z.string().optional().describe('Optional: Batch or lot number to cross-check against the reported counterfeit batch registry')
    }),
    examples: {
      request: { drug_name: 'Metformin', ndc_code: '0093-1075-01' },
      response: {
        drug_name: 'Metformin',
        manufacturer: 'TEVA PHARMACEUTICALS USA INC',
        ndc_code: '0093-1075-01',
        batch_number: null,
        authenticity_status: 'verified',
        confidence: 'Medium',
        explanation: 'NDC code found in FDA registry. No active recalls. No batch number provided for counterfeit check.',
        recall_information: null,
        counterfeit_warning: null,
        source: 'openFDA'
      }
    }
  })
  @Widget('medication-authenticity')
  async verifyMedicationAuthenticity(
    input: { drug_name: string; ndc_code?: string; batch_number?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Starting medication authenticity verification', {
      drug_name: input.drug_name,
      has_ndc: !!input.ndc_code,
      has_batch: !!input.batch_number
    });

    // Mutable result state
    let authenticityStatus: AuthenticityStatus = 'unrecognized_product';
    let confidence: ConfidenceLevel = 'Low';
    let explanation = '';
    let manufacturer = '';
    let resolvedNdc = input.ndc_code || '';
    let recallInformation: Record<string, unknown> | null = null;
    let counterfeitWarning: Record<string, unknown> | null = null;
    let ndcResolvedDirectly = false;
    let ndcResolvedByName = false;
    let recallFound = false;
    let networkError = false;

    // -----------------------------------------------------------------------
    // STEP 1 — openFDA NDC Directory Check
    // -----------------------------------------------------------------------
    try {
      let ndcSearchUrl: string;

      if (input.ndc_code) {
        const encoded = encodeURIComponent(`"${input.ndc_code}"`);
        ndcSearchUrl = `https://api.fda.gov/drug/ndc.json?search=product_ndc:${encoded}&limit=1`;
      } else {
        const nameEncoded = encodeURIComponent(input.drug_name);
        ndcSearchUrl = `https://api.fda.gov/drug/ndc.json?search=generic_name:"${nameEncoded}"+brand_name:"${nameEncoded}"&limit=2`;
      }

      const ndcResponse = await fetchWithTimeout(ndcSearchUrl, 7000);

      if (ndcResponse.status === 404) {
        authenticityStatus = 'unrecognized_product';
        confidence = 'Low';
        explanation = input.ndc_code
          ? `This NDC code (${input.ndc_code}) does not exist in the FDA registry.`
          : `No NDC provided and no confident name match found in the FDA registry for "${input.drug_name}".`;
        ctx.logger.info('NDC not found in FDA registry', { ndc: input.ndc_code, drug: input.drug_name });
      } else if (!ndcResponse.ok) {
        throw new Error(`openFDA NDC API returned HTTP ${ndcResponse.status}`);
      } else {
        const ndcJson = await ndcResponse.json() as { results?: Record<string, unknown>[] };
        const results = ndcJson.results || [];

        if (results.length === 0) {
          authenticityStatus = 'unrecognized_product';
          confidence = 'Low';
          explanation = input.ndc_code
            ? `NDC code ${input.ndc_code} not found in the FDA NDC directory.`
            : `No confident name match found for "${input.drug_name}" in the FDA NDC directory.`;
        } else if (!input.ndc_code && results.length > 1) {
          authenticityStatus = 'unrecognized_product';
          confidence = 'Low';
          explanation = `No NDC provided and multiple possible matches found for "${input.drug_name}" — cannot verify with confidence.`;
        } else {
          const record = results[0];
          manufacturer = String((record.labeler_name as string) || '');
          resolvedNdc = String((record.product_ndc as string) || input.ndc_code || '');

          if (input.ndc_code) {
            ndcResolvedDirectly = true;
          } else {
            ndcResolvedByName = true;
          }

          ctx.logger.info('NDC resolved', {
            ndc: resolvedNdc,
            manufacturer,
            direct: ndcResolvedDirectly
          });
        }
      }
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      ctx.logger.error('NDC lookup failed', {
        error: err instanceof Error ? err.message : String(err),
        timeout: isTimeout
      });
      networkError = true;
    }

    // If network error already occurred, short-circuit
    if (networkError) {
      return this.buildUnableToVerify(input.drug_name, resolvedNdc, input.batch_number);
    }

    // -----------------------------------------------------------------------
    // STEP 2 — openFDA Recall Enforcement Check (only if NDC was resolved)
    // -----------------------------------------------------------------------
    if (ndcResolvedDirectly || ndcResolvedByName) {
      try {
        let recallUrl: string;
        if (resolvedNdc) {
          const ndcEncoded = encodeURIComponent(`"${resolvedNdc}"`);
          recallUrl = `https://api.fda.gov/drug/enforcement.json?search=openfda.product_ndc:${ndcEncoded}&limit=1`;
        } else {
          const nameEncoded = encodeURIComponent(`"${input.drug_name}"`);
          recallUrl = `https://api.fda.gov/drug/enforcement.json?search=product_description:${nameEncoded}&limit=1`;
        }

        const recallResponse = await fetchWithTimeout(recallUrl, 7000);

        if (recallResponse.status === 404) {
          ctx.logger.info('No recalls found', { ndc: resolvedNdc });
        } else if (!recallResponse.ok) {
          throw new Error(`openFDA Enforcement API returned HTTP ${recallResponse.status}`);
        } else {
          const recallJson = await recallResponse.json() as { results?: Record<string, unknown>[] };
          const recallResults = recallJson.results || [];

          if (recallResults.length > 0) {
            recallFound = true;
            const recall = recallResults[0];
            recallInformation = {
              recall_number: recall.recall_number,
              reason_for_recall: recall.reason_for_recall,
              classification: recall.classification,
              recall_initiation_date: recall.recall_initiation_date,
              recalling_firm: recall.recalling_firm,
              product_description: recall.product_description,
              distribution_pattern: recall.distribution_pattern,
              status: recall.status
            };
            ctx.logger.warn('Active recall found', { ndc: resolvedNdc, recall_number: String(recall.recall_number) });
          }
        }
      } catch (err) {
        const isTimeout = err instanceof Error && err.name === 'AbortError';
        ctx.logger.error('Recall check failed', {
          error: err instanceof Error ? err.message : String(err),
          timeout: isTimeout
        });
        networkError = true;
      }
    }

    if (networkError) {
      return this.buildUnableToVerify(input.drug_name, resolvedNdc, input.batch_number);
    }

    // -----------------------------------------------------------------------
    // STEP 3 — Mock Counterfeit-Batch Check
    // -----------------------------------------------------------------------
    let batchChecked = false;
    let batchMatchFound = false;

    if (input.batch_number) {
      try {
        const batches = loadJSON<CounterfeitBatch[]>('reported_counterfeit_batches.json', 'counterfeit batch registry');

        const match = batches.find(
          b => b.batch.toUpperCase() === input.batch_number!.toUpperCase()
        );

        batchChecked = true;
        if (match) {
          batchMatchFound = true;
          counterfeitWarning = {
            batch_number: match.batch,
            drug: match.drug,
            reason: match.reason,
            reported_date: match.reported_date,
            severity: match.severity,
            source: match.source
          };
          ctx.logger.warn('Counterfeit batch match found', { batch: input.batch_number });
        }
      } catch (err) {
        ctx.logger.error('Failed to load counterfeit batch DB', {
          error: err instanceof Error ? err.message : String(err)
        });
        // Non-fatal: treat batch as unchecked
        batchChecked = false;
      }
    }

    // -----------------------------------------------------------------------
    // STEP 4 — Final Status & Confidence Resolution Matrix
    // -----------------------------------------------------------------------
    if (batchMatchFound) {
      authenticityStatus = 'flagged_reported_counterfeit';
      confidence = 'High';
      explanation = `Batch number "${input.batch_number}" matched an entry in the reported counterfeit batch registry for ${(counterfeitWarning as { drug: string }).drug}. Reason: ${(counterfeitWarning as { reason: string }).reason}`;
    } else if (recallFound) {
      authenticityStatus = 'flagged_recall';
      confidence = 'High';
      explanation = `Active FDA recall found for this product. Reason: ${(recallInformation as { reason_for_recall?: string }).reason_for_recall || 'See recall information for details.'} Classification: ${(recallInformation as { classification?: string }).classification || 'Unknown'}.`;
    } else if (ndcResolvedDirectly && batchChecked) {
      authenticityStatus = 'verified';
      confidence = 'High';
      explanation = `NDC code ${resolvedNdc} is registered in the FDA NDC directory under ${manufacturer || 'verified manufacturer'}. No active recalls found. Batch number verified clean against the counterfeit registry.`;
    } else if (ndcResolvedDirectly && !batchChecked) {
      authenticityStatus = 'verified';
      confidence = 'Medium';
      explanation = `NDC code ${resolvedNdc} is registered in the FDA NDC directory under ${manufacturer || 'verified manufacturer'}. No active recalls found. No batch number provided — counterfeit check skipped (confidence capped at Medium).`;
    } else if (ndcResolvedByName) {
      authenticityStatus = 'verified';
      confidence = 'Medium';
      explanation = `"${input.drug_name}" was matched in the FDA NDC directory by name (NDC: ${resolvedNdc}, manufacturer: ${manufacturer || 'unknown'}). No direct NDC was supplied, so confidence is capped at Medium. No recalls found.`;
    } else {
      // authenticityStatus remains 'unrecognized_product', confidence 'Low' from Step 1
    }

    ctx.logger.info('Authenticity verification complete', {
      status: authenticityStatus,
      confidence,
      drug: input.drug_name
    });

    return {
      drug_name: input.drug_name,
      manufacturer: manufacturer || null,
      ndc_code: resolvedNdc || null,
      batch_number: input.batch_number || null,
      authenticity_status: authenticityStatus,
      confidence: (authenticityStatus as string) === 'unable_to_verify' ? null : confidence,
      explanation,
      recall_information: recallInformation,
      counterfeit_warning: counterfeitWarning,
      source: 'openFDA'
    };
  }

  // -------------------------------------------------------------------------
  // Private: build unable_to_verify response
  // -------------------------------------------------------------------------

  private buildUnableToVerify(
    drugName: string,
    ndc: string,
    batchNumber?: string
  ) {
    return {
      drug_name: drugName,
      manufacturer: null,
      ndc_code: ndc || null,
      batch_number: batchNumber || null,
      authenticity_status: 'unable_to_verify' as AuthenticityStatus,
      confidence: null,
      explanation:
        'The openFDA registry could not be reached due to a network timeout or server error. This does not indicate a problem with the medication — please retry or verify through an alternative channel.',
      recall_information: null,
      counterfeit_warning: null,
      source: 'openFDA'
    };
  }
}
