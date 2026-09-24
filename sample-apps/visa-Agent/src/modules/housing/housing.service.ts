import { Injectable } from '@nitrostack/core';
import { randomUUID } from 'node:crypto';
import { MongoService, COLLECTIONS } from '../../services/mongodb.service.js';
import type { VisaCaseRecord } from '../case/case.service.js';

/* ------------------------------ Stored shapes ----------------------------- */

/** Caller-supplied housing preferences (`collect_housing_preferences`). */
export interface HousingPreferencesInput {
    caseId: string;
    preferredAreas: string[];
    apartmentType: string;
    monthlyBudget: number;
    currency: string;
    moveInBy: string;
    familySize: number;
    priorities: string[];
    hardExclusions: string[];
    description: string;
}

/**
 * `housing_preferences` document.
 *
 * TODO(housing): needs tenantId, actor identity, and correlation ID per
 * docs/ARCHITECTURE.md §16, plus an index on { caseId } and tenant-scoped
 * uniqueness before multi-tenant use.
 */
export interface HousingPreferencesRecord extends HousingPreferencesInput {
    preferenceId: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * `broker_profiles` document.
 *
 * Read-only in this slice — broker onboarding and profile maintenance belong
 * to the Broker Module (docs/MODULES.md §3.6) and are not implemented here.
 * Budget bounds are optional and treated as open-ended when absent.
 */
/**
 * [LLD] Broker model — target shape
 * `{ _id, name, localities:[...], languages:[...], capacity, currentWorkload,
 * successRate, active }`. It feeds the recommendation scorer, and workload is
 * re-checked and updated only when a human-approved assignment commits.
 *
 * This profile preserves the fields needed by the delivered housing filter;
 * capacity, success-rate scoring, and assignment ownership remain planned.
 */
export interface BrokerProfile {
    brokerId: string;
    name: string;
    description: string;
    rating: number;
    country: string;
    city?: string;
    areasCovered: string[];
    apartmentTypes: string[];
    minBudget?: number;
    maxBudget?: number;
    currency: string;
    languages: string[];
    previousCasesHandled: number;
    active: boolean;
}

/** The broker fields `recommend_brokers` returns. */
export interface BrokerCandidate {
    brokerId: string;
    name: string;
    description: string;
    rating: number;
    areasCovered: string[];
    languages: string[];
    previousCasesHandled: number;
}

/** Compact preference view returned alongside the candidates. */
export interface HousingPreferenceSummary {
    caseId: string;
    destinationCountry: string;
    preferredAreas: string[];
    apartmentType: string;
    monthlyBudget: number;
    currency: string;
    moveInBy: string;
    familySize: number;
    priorities: string[];
    hardExclusions: string[];
    description: string;
}

/** Structured, model-agnostic payload for the downstream ranking stage. */
export interface BrokerRankingPrompt {
    task: string;
    instructions: string[];
    constraints: string[];
    preferences: HousingPreferenceSummary;
    candidates: BrokerCandidate[];
    expectedOutputSchema: Record<string, unknown>;
}

/* -------------------------------- Helpers --------------------------------- */

/** Case/whitespace-insensitive comparison key. */
function normalize(value: string): string {
    return value.trim().toLowerCase();
}

function normalizeAll(values: string[] | undefined): string[] {
    return (values ?? []).map(normalize).filter((v) => v.length > 0);
}

/**
 * True when any preferred area matches the broker's covered areas or city.
 *
 * The case record carries a destination country but no city, and the
 * preference input carries areas rather than a city, so locality is decided
 * by intersecting those two sets. Matching is exact-after-normalization —
 * deliberately not fuzzy, so a broker is never surfaced for an area they did
 * not actually list.
 */
function hasAreaOverlap(preferredAreas: string[], broker: BrokerProfile): boolean {
    const wanted = new Set(normalizeAll(preferredAreas));
    if (wanted.size === 0) return false;

    const covered = normalizeAll(broker.areasCovered);
    if (broker.city) covered.push(normalize(broker.city));

    return covered.some((area) => wanted.has(area));
}

/**
 * True when the applicant's monthly budget falls inside the broker's
 * supported range, in the same currency. Missing bounds are open-ended;
 * a currency mismatch is always disqualifying, since comparing amounts
 * across currencies without a rate would be meaningless.
 */
function budgetOverlaps(
    monthlyBudget: number,
    currency: string,
    broker: BrokerProfile
): boolean {
    if (normalize(broker.currency) !== normalize(currency)) return false;
    if (typeof broker.minBudget === 'number' && monthlyBudget < broker.minBudget) return false;
    if (typeof broker.maxBudget === 'number' && monthlyBudget > broker.maxBudget) return false;
    return true;
}

function supportsApartmentType(apartmentType: string, broker: BrokerProfile): boolean {
    return normalizeAll(broker.apartmentTypes).includes(normalize(apartmentType));
}

function toCandidate(broker: BrokerProfile): BrokerCandidate {
    return {
        brokerId: broker.brokerId,
        name: broker.name,
        description: broker.description,
        rating: broker.rating,
        areasCovered: broker.areasCovered,
        languages: broker.languages,
        previousCasesHandled: broker.previousCasesHandled
    };
}

export const MAX_BROKER_CANDIDATES = 10;

/**
 * HousingService
 *
 * Fifth vertical slice. Owns housing preference capture and deterministic
 * broker shortlisting, persisted in MongoDB Atlas.
 *
 * No LLM call happens anywhere in this class. `recommend_brokers` filters and
 * orders candidates by explicit rules only; `prepareBrokerRankingPrompt`
 * builds a payload for a ranking stage but never invokes a model.
 *
 * TODO(housing): a recommendation is advisory only. Human approval is
 * mandatory before broker assignment (docs/MODULES.md §46, §3.6) — this
 * service must never set an assignment, select a broker, or emit anything a
 * caller could mistake for an assignment decision.
 * TODO(housing): no audit entry or `broker.recommended` event is written yet
 * (docs/EVENTS.md).
 * TODO(housing): broker handoff must be minimum-necessary (docs/MODULES.md
 * §3.6). This slice returns only public broker profile fields and never
 * exposes case data to brokers.
 */
@Injectable({ deps: [MongoService] })
export class HousingService {
    constructor(private mongo: MongoService) { }

    /**
     * Upserts the housing preferences for a case.
     *
     * Upsert (rather than insert) keyed on caseId, so re-running intake for
     * the same case corrects the record instead of accumulating duplicates
     * that later reads would have to disambiguate.
     */
    async savePreferences(input: HousingPreferencesInput): Promise<HousingPreferencesRecord> {
        const collection = await this.mongo.collection<HousingPreferencesRecord>(
            COLLECTIONS.housingPreferences
        );

        const now = new Date().toISOString();
        const existing = await collection.findOne({ caseId: input.caseId });

        const record: HousingPreferencesRecord = {
            ...input,
            preferenceId: existing?.preferenceId ?? randomUUID(),
            createdAt: existing?.createdAt ?? now,
            updatedAt: now
        };

        await collection.updateOne(
            { caseId: input.caseId },
            { $set: record },
            { upsert: true }
        );

        return record;
    }

    /**
     * Reads back the stored preferences for a case.
     *
     * TODO(housing): normalize into a stable application error
     * (e.g. HousingPreferencesNotFoundError) once the error taxonomy from
     * docs/ARCHITECTURE.md §16 exists, instead of a plain Error.
     */
    async getPreferences(caseId: string): Promise<HousingPreferencesRecord> {
        const collection = await this.mongo.collection<HousingPreferencesRecord>(
            COLLECTIONS.housingPreferences
        );
        const record = await collection.findOne(
            { caseId },
            { projection: { _id: 0 } }
        );

        if (!record) {
            throw new Error(
                `No housing preferences found for case ${caseId}. ` +
                'Run collect_housing_preferences first.'
            );
        }
        return record;
    }

    /**
     * Deterministically shortlists active brokers for a case.
     *
     * Filters applied, all required:
     * - `active === true`
     * - broker country matches the case's destination country
     * - a preferred area matches the broker's covered areas or city
     * - the monthly budget falls in the broker's range, same currency
     * - the broker handles the requested apartment type
     *
     * Ordering is rating desc, then previousCasesHandled desc, then brokerId
     * asc. The brokerId tiebreak makes the result stable: the same data
     * always yields the same order, which a ranking stage downstream can
     * rely on.
     */
    async findEligibleBrokers(
        visaCase: VisaCaseRecord,
        preferences: HousingPreferencesRecord
    ): Promise<BrokerCandidate[]> {
        const collection = await this.mongo.collection<BrokerProfile>(COLLECTIONS.brokerProfiles);

        // Country + active are pushed into the query; the remaining rules are
        // applied in code so the matching semantics stay readable and testable
        // in one place rather than split across a Mongo filter document.
        const brokers = await collection
            .find({ active: true }, { projection: { _id: 0 } })
            .toArray();

        const destination = normalize(visaCase.destinationCountry);

        return brokers
            .filter((broker) => normalize(broker.country) === destination)
            .filter((broker) => hasAreaOverlap(preferences.preferredAreas, broker))
            .filter((broker) => budgetOverlaps(preferences.monthlyBudget, preferences.currency, broker))
            .filter((broker) => supportsApartmentType(preferences.apartmentType, broker))
            .sort((a, b) => {
                if (b.rating !== a.rating) return b.rating - a.rating;
                if (b.previousCasesHandled !== a.previousCasesHandled) {
                    return b.previousCasesHandled - a.previousCasesHandled;
                }
                return a.brokerId.localeCompare(b.brokerId);
            })
            .slice(0, MAX_BROKER_CANDIDATES)
            .map(toCandidate);
    }

    /** Compact preference view returned with the candidates. */
    buildPreferenceSummary(
        visaCase: VisaCaseRecord,
        preferences: HousingPreferencesRecord
    ): HousingPreferenceSummary {
        return {
            caseId: preferences.caseId,
            destinationCountry: visaCase.destinationCountry,
            preferredAreas: preferences.preferredAreas,
            apartmentType: preferences.apartmentType,
            monthlyBudget: preferences.monthlyBudget,
            currency: preferences.currency,
            moveInBy: preferences.moveInBy,
            familySize: preferences.familySize,
            priorities: preferences.priorities,
            hardExclusions: preferences.hardExclusions,
            description: preferences.description
        };
    }

    /**
     * Builds the structured payload for the downstream LLM ranking stage.
     *
     * This method prepares data only — it does not call, embed, or configure
     * any model, and it must stay that way: keeping preparation separate from
     * invocation is what lets the deterministic shortlist above remain
     * auditable independently of whatever ranks it.
     *
     * TODO(housing): the ranking stage that consumes this must treat its
     * output as advisory. Ranking never assigns a broker — assignment
     * requires explicit human approval (docs/MODULES.md §46).
     */
    prepareBrokerRankingPrompt(
        preferences: HousingPreferenceSummary,
        candidates: BrokerCandidate[]
    ): BrokerRankingPrompt {
        return {
            task: 'Rank the candidate housing brokers by how well they fit the applicant\'s stated housing preferences.',
            instructions: [
                'Rank every candidate provided. Do not invent brokers or fields not present in the candidate list.',
                'Base the ranking only on the supplied preferences and candidate attributes.',
                'For each broker, cite the concrete factors that matched and the trade-offs that did not.',
                'State a confidence level per broker and explain any low confidence.',
                'If a hard exclusion cannot be verified from the candidate data, say so rather than assuming compliance.'
            ],
            constraints: [
                'Every candidate already satisfies the deterministic filters: same destination country, overlapping preferred area, budget within range, matching apartment type, and active status.',
                'This ranking is advisory only. It does not assign a broker and does not constitute an assignment decision.',
                'Broker assignment requires explicit human approval and must never be inferred from this ranking.',
                'Do not disclose applicant case details to brokers; this payload is for internal ranking only.'
            ],
            preferences,
            candidates,
            expectedOutputSchema: {
                rankedBrokers: [
                    {
                        brokerId: 'string — must match a candidate brokerId',
                        score: 'number 0-100',
                        matchedFactors: ['string'],
                        tradeoffs: ['string'],
                        confidence: 'high | medium | low'
                    }
                ],
                reasoningSteps: ['string']
            }
        };
    }

    /**
     * Persists the advisory shortlist for later review.
     *
     * Status is fixed at `PENDING_RANKING`: this slice produces candidates
     * only. Selection, approval, and assignment states are owned by the
     * Approval and Broker modules and are deliberately not written here.
     */
    async saveRecommendation(params: {
        caseId: string;
        preferences: HousingPreferenceSummary;
        candidates: BrokerCandidate[];
    }): Promise<string> {
        const collection = await this.mongo.collection(COLLECTIONS.brokerRecommendations);
        const recommendationId = randomUUID();

        await collection.insertOne({
            recommendationId,
            caseId: params.caseId,
            requirements: params.preferences,
            candidates: params.candidates,
            candidateCount: params.candidates.length,
            status: 'PENDING_RANKING',
            createdAt: new Date().toISOString()
        });

        return recommendationId;
    }
}
