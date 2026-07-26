import { Injectable } from '@nitrostack/core';
import { randomUUID } from 'node:crypto';
import { MongoService, COLLECTIONS } from '../../services/mongodb.service.js';
import {
    type BrokerCandidate,
    type BrokerProfile
} from '../housing/housing.service.js';
import type { VisaCaseRecord } from '../case/case.service.js';

/**
 * [HLD] Broker / Property Recommendation Engine
 * [STATUS: STUB — the target multi-step scorer is documented; current code is
 * a transparent hackathon random-selection demo]
 * ------------------------------------------------------------------
 * Target responsibility: recommend — never assign — a ranked, explainable
 * shortlist for ops approval. It should extract client needs, fetch eligible
 * brokers, score locality match, inverse workload, success rate, language
 * match, and capacity, then return top-N reasons. Assignment is a separately
 * OAuth-gated human action.
 *
 * The intended engine uses MongoDB broker data, LLM needs/rationale helpers,
 * configurable weights, and the recommendation widget/Ops Canvas. Future
 * weights may learn from outcomes, but recommendations remain explainable.
 * [/HLD]
 */
export interface RankedBroker {
    brokerId: string;
    rank: number;
    reason: string;
}

/** Kept unchanged for the public `recommend_best_brokers` response contract. */
export interface BrokerRanking {
    recommendedBroker: string;
    confidence: number;
    reason: string;
    topThree: RankedBroker[];
}

export interface DemoBrokerRecommendation {
    recommendationId: string;
    candidateCount: number;
    ranking: BrokerRanking | null;
}

const DEMO_REASON = 'Demo mode random broker selection.';

function normalize(value: string): string {
    return value.trim().toLowerCase();
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

/** One random shuffle drives both the selected broker and the top-three list. */
function shuffle<T>(items: T[]): T[] {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const replacement = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[replacement]] = [shuffled[replacement], shuffled[index]];
    }

    return shuffled;
}

/**
 * Hackathon-only broker selection. This deliberately does not load housing
 * preferences, invoke a model, build embeddings, rank candidates, or persist
 * a recommendation. It only reads active profiles and optionally filters by
 * the case destination country.
 */
@Injectable({ deps: [MongoService] })
export class RecommendationService {
    constructor(private mongo: MongoService) { }

    /**
     * [LLD] recommend_broker(caseId) — target behavior
     * 1. Extract `{ locality, budget band, family size, property type,
     *    language preference }` from the profile.
     * 2. Fetch active brokers covering the locality.
     * 3. Score `w1*localityMatch + w2*(1 - normWorkload) + w3*successRate
     *    + w4*languageMatch + w5*capacity`; sort, then explain the top N.
     * 4. No local candidates widens the search one tier and labels the result;
     *    ties break on lowest workload. Assignment re-checks capacity.
     *
     * This method is intentionally not that engine: it documents and executes
     * only the current random demo selection, with no assignment side effect.
     */
    async recommendDemoBroker(visaCase: VisaCaseRecord): Promise<DemoBrokerRecommendation> {
        const collection = await this.mongo.collection<BrokerProfile>(COLLECTIONS.brokerProfiles);
        const available = await collection
            .find({ active: true }, { projection: { _id: 0 } })
            .toArray();

        const destination = visaCase.destinationCountry.trim();
        const countryMatches = destination.length > 0
            ? available.filter((broker) => normalize(broker.country) === normalize(destination))
            : [];

        // When there is no destination match, use all available brokers.
        const candidates = (countryMatches.length > 0 ? countryMatches : available).map(toCandidate);

        if (candidates.length === 0) {
            return {
                recommendationId: randomUUID(),
                candidateCount: 0,
                ranking: null
            };
        }

        const randomlyOrdered = shuffle(candidates);
        const selected = randomlyOrdered[0];

        return {
            recommendationId: randomUUID(),
            candidateCount: candidates.length,
            ranking: {
                recommendedBroker: selected.brokerId,
                confidence: 1.0,
                reason: DEMO_REASON,
                topThree: randomlyOrdered.slice(0, 3).map((broker, index) => ({
                    brokerId: broker.brokerId,
                    rank: index + 1,
                    reason: DEMO_REASON
                }))
            }
        };
    }
}
