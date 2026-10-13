/**
 * ClinicalTrialsService — ClinicalTrials.gov API v2 client.
 * REST API v2 interface for querying clinical trial protocols and studies.
 */
import { Injectable } from '@nitrostack/core';
import { HttpClientService } from './http-client.service.js';
import { env } from '../config/env.js';

export type TrialStatusFilter = 'any' | 'recruiting' | 'active_not_recruiting' | 'completed';
export type TrialPhaseFilter = 'any' | '1' | '2' | '3' | '4';

const STATUS_MAP: Record<Exclude<TrialStatusFilter, 'any'>, string> = {
  recruiting: 'RECRUITING',
  active_not_recruiting: 'ACTIVE_NOT_RECRUITING',
  completed: 'COMPLETED',
};

const PHASE_MAP: Record<Exclude<TrialPhaseFilter, 'any'>, string> = {
  '1': 'PHASE1',
  '2': 'PHASE2',
  '3': 'PHASE3',
  '4': 'PHASE4',
};

export interface ClinicalTrialSummary {
  nct_id: string;
  title: string;
  overall_status: string;
  phases: string[];
  conditions: string[];
  lead_sponsor?: string;
  start_date?: string;
  locations: Array<{ city?: string; country?: string }>;
  url: string;
}

export interface ClinicalTrialDetails {
  nct_id: string;
  title: string;
  status: string;
  phase: string[];
  sponsor: string;
  conditions: string[];
  interventions: Array<{ type?: string; name?: string }>;
  start_date?: string;
  eligibility: {
    criteria?: string;
    sex?: string;
    min_age?: string;
    max_age?: string;
  };
  primary_outcomes: string[];
  locations: Array<{ facility?: string; city?: string; country?: string }>;
  contacts: Array<{ name?: string; role?: string; phone?: string; email?: string }>;
  url: string;
}

@Injectable({ deps: [HttpClientService] })
export class ClinicalTrialsService {
  constructor(private readonly http: HttpClientService) {}

  /** Search clinical trials by condition with status and phase filters. */
  async searchTrials(
    condition: string,
    status: TrialStatusFilter = 'any',
    phase: TrialPhaseFilter = 'any',
    maxResults: number = 10,
  ): Promise<{ total_count: number; trials: ClinicalTrialSummary[]; widened?: boolean }> {
    let result = await this.executeSearch(condition, status, phase, maxResults);

    // Auto-widen if zero hits and phase filter was specified (per §4.3 failure mode)
    if (result.trials.length === 0 && phase !== 'any') {
      const widenedResult = await this.executeSearch(condition, status, 'any', maxResults);
      if (widenedResult.trials.length > 0) {
        return { ...widenedResult, widened: true };
      }
    }

    return result;
  }

  private async executeSearch(
    condition: string,
    status: TrialStatusFilter,
    phase: TrialPhaseFilter,
    maxResults: number,
  ): Promise<{ total_count: number; trials: ClinicalTrialSummary[] }> {
    const params = new URLSearchParams();
    params.set('query.cond', condition);
    params.set('pageSize', String(maxResults));
    params.set(
      'fields',
      'NCTId,BriefTitle,OverallStatus,Phase,Condition,LeadSponsorName,StartDate,LocationCity,LocationCountry',
    );

    if (status !== 'any') {
      params.set('filter.overallStatus', STATUS_MAP[status]);
    }
    if (phase !== 'any') {
      params.set('filter.phase', PHASE_MAP[phase]);
    }

    const url = `${env.TRIALS_BASE_URL}/studies?${params.toString()}`;

    const res = await this.http.getJson<{
      totalCount?: number;
      studies?: Array<{
        protocolSection?: {
          identificationModule?: { nctId?: string; briefTitle?: string };
          statusModule?: { overallStatus?: string; startDateStruct?: { date?: string } };
          designModule?: { phases?: string[] };
          conditionsModule?: { conditions?: string[] };
          sponsorCollaboratorsModule?: { leadSponsor?: { name?: string } };
          contactsLocationsModule?: {
            locations?: Array<{ city?: string; country?: string }>;
          };
        };
      }>;
    }>({
      api: 'clinicaltrials',
      url,
    });

    const totalCount = res.data.totalCount ?? res.data.studies?.length ?? 0;
    const studies = res.data.studies ?? [];

    const trials: ClinicalTrialSummary[] = studies.map((st) => {
      const ps = st.protocolSection ?? {};
      const nctId = ps.identificationModule?.nctId ?? 'UNKNOWN';
      return {
        nct_id: nctId,
        title: ps.identificationModule?.briefTitle ?? '',
        overall_status: ps.statusModule?.overallStatus ?? 'UNKNOWN',
        phases: ps.designModule?.phases ?? [],
        conditions: ps.conditionsModule?.conditions ?? [],
        lead_sponsor: ps.sponsorCollaboratorsModule?.leadSponsor?.name,
        start_date: ps.statusModule?.startDateStruct?.date,
        locations: (ps.contactsLocationsModule?.locations ?? []).slice(0, 3).map((loc) => ({
          city: loc.city,
          country: loc.country,
        })),
        url: `https://clinicaltrials.gov/study/${nctId}`,
      };
    });

    return { total_count: totalCount, trials };
  }

  /** Get detailed trial protocol information for a given NCT ID. */
  async getTrialDetails(nctId: string): Promise<ClinicalTrialDetails> {
    const url = `${env.TRIALS_BASE_URL}/studies/${encodeURIComponent(nctId)}`;

    const res = await this.http.getJson<{
      protocolSection?: {
        identificationModule?: { nctId?: string; briefTitle?: string };
        statusModule?: { overallStatus?: string; startDateStruct?: { date?: string } };
        designModule?: { phases?: string[] };
        conditionsModule?: { conditions?: string[] };
        sponsorCollaboratorsModule?: { leadSponsor?: { name?: string } };
        armsInterventionsModule?: {
          interventions?: Array<{ type?: string; name?: string }>;
        };
        eligibilityModule?: {
          eligibilityCriteria?: string;
          sex?: string;
          minimumAge?: string;
          maximumAge?: string;
        };
        outcomesModule?: {
          primaryOutcomes?: Array<{ measure?: string }>;
        };
        contactsLocationsModule?: {
          locations?: Array<{ facility?: string; city?: string; country?: string }>;
          centralContacts?: Array<{ name?: string; role?: string; phone?: string; email?: string }>;
        };
      };
    }>({
      api: 'clinicaltrials',
      url,
    });

    const ps = res.data.protocolSection ?? {};
    const id = ps.identificationModule?.nctId ?? nctId;

    return {
      nct_id: id,
      title: ps.identificationModule?.briefTitle ?? '',
      status: ps.statusModule?.overallStatus ?? 'UNKNOWN',
      phase: ps.designModule?.phases ?? [],
      conditions: ps.conditionsModule?.conditions ?? [],
      sponsor: ps.sponsorCollaboratorsModule?.leadSponsor?.name ?? 'Unspecified',
      start_date: ps.statusModule?.startDateStruct?.date,
      locations: (ps.contactsLocationsModule?.locations ?? []).map((loc) => ({
        facility: loc.facility,
        city: loc.city,
        country: loc.country,
      })),
      url: `https://clinicaltrials.gov/study/${id}`,
      interventions: (ps.armsInterventionsModule?.interventions ?? []).map((i) => ({
        type: i.type,
        name: i.name,
      })),
      eligibility: {
        criteria: ps.eligibilityModule?.eligibilityCriteria,
        sex: ps.eligibilityModule?.sex,
        min_age: ps.eligibilityModule?.minimumAge,
        max_age: ps.eligibilityModule?.maximumAge,
      },
      primary_outcomes: (ps.outcomesModule?.primaryOutcomes ?? [])
        .map((o) => o.measure ?? '')
        .filter(Boolean),
      contacts: (ps.contactsLocationsModule?.centralContacts ?? []).map((c) => ({
        name: c.name,
        role: c.role,
        phone: c.phone,
        email: c.email,
      })),
    };
  }
}
