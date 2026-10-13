/**
 * ScopeGuard — Authorizes incoming tool execution against required scope matrix.
 */
import { Guard, ExecutionContext, Injectable } from '@nitrostack/core';
import { AuthContext } from './api-key.guard.js';

const TOOL_SCOPE_MAP: Record<string, string> = {
  // Triage module
  triage_assess_symptoms: 'triage:read',
  triage_check_red_flags: 'triage:read',
  triage_get_care_options: 'triage:read',

  // Drugs module
  drug_search: 'drugs:read',
  drugs_search: 'drugs:read',
  drug_get_label_info: 'drugs:read',
  drugs_get_label_info: 'drugs:read',
  drug_check_interactions: 'drugs:read',
  drugs_check_interactions: 'drugs:read',
  drug_get_adverse_events: 'drugs:read',
  drugs_get_adverse_events: 'drugs:read',
  drug_get_recalls: 'drugs:read',
  drugs_get_recalls: 'drugs:read',

  // Diagnostics module (public runtime names include the controller prefix)
  dx_lookup_condition: 'dx:read',
  diagnostics_lookup_condition: 'dx:read',
  dx_lookup_icd11: 'dx:read',
  diagnostics_lookup_icd11: 'dx:read',
  dx_interpret_lab_value: 'dx:read',
  diagnostics_interpret_lab_value: 'dx:read',
  dx_explain_lab_test: 'dx:read',
  diagnostics_explain_lab_test: 'dx:read',
  dx_symptom_to_codes: 'dx:read',
  diagnostics_symptom_to_codes: 'dx:read',

  // Research module
  research_search_pubmed: 'research:read',
  research_get_article: 'research:read',
  research_search_trials: 'research:read',
  research_get_trial_details: 'research:read',
  research_summarize_evidence: 'research:read',

  // FHIR module
  fhir_search_patients: 'fhir:read',
  fhir_get_patient: 'fhir:read',
  fhir_get_conditions: 'fhir:read',
  fhir_get_medications: 'fhir:read',
  fhir_get_observations: 'fhir:read',
  fhir_get_encounters: 'fhir:read',
  fhir_get_patient_summary: 'fhir:read',
  fhir_get_allergies: 'fhir:read',
  fhir_get_immunizations: 'fhir:read',

  // Care Coordination module
  care_generate_handoff: 'care:read',
  care_find_guidelines: 'care:read',
  care_appointment_prep: 'care:read',
  care_reconcile_medications: 'care:write',
  care_draft_referral: 'care:write',
};

export function hasAdminScope(auth: AuthContext | undefined): boolean {
  if (!auth?.isAdmin) return false;
  return auth.scopes.includes('*') || auth.scopes.includes('admin:audit');
}

@Injectable()
export class ScopeGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const auth: AuthContext | undefined = (context as any).auth;
    if (!auth) {
      throw new Error('AUTH_DENIED: Unauthenticated context.');
    }

    const toolName = context.toolName;
    if (!toolName) {
      throw new Error('SCOPE_DENIED: No authorization policy is defined for an unnamed tool.');
    }

    const requiredScope = TOOL_SCOPE_MAP[toolName];
    if (!requiredScope) {
      throw new Error(`SCOPE_DENIED: No authorization policy is defined for tool '${toolName}'.`);
    }

    if (auth.scopes.includes('*')) {
      if (!auth.isAdmin) {
        throw new Error(
          `SCOPE_DENIED: Wildcard scope is restricted to the explicitly configured admin identity.`,
        );
      }
      return true;
    }

    if (requiredScope === 'admin:audit' && !hasAdminScope(auth)) {
      throw new Error(
        `SCOPE_DENIED: Accessing tool '${toolName}' requires the configured admin identity.`,
      );
    }

    if (!auth.scopes.includes(requiredScope)) {
      throw new Error(`SCOPE_DENIED: Accessing tool '${toolName}' requires scope '${requiredScope}'.`);
    }

    return true;
  }
}
