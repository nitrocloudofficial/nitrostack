import { Module } from '@nitrostack/core';
import { HousingTools } from './housing.tools.js';
import { HousingService } from './housing.service.js';
import { MongoService } from '../../services/mongodb.service.js';
import { CaseModule } from '../case/case.module.js';

/**
 * Housing Module
 *
 * Fifth vertical slice, and the first module backed by MongoDB Atlas rather
 * than process memory. Responsibilities per this iteration's scope:
 * - `collect_housing_preferences`: verifies the case exists via
 *   VisaCaseService (imported from CaseModule via NitroStack DI, not HTTP,
 *   not tool-to-tool), then upserts the applicant's housing preferences into
 *   the `housing_preferences` collection.
 * - `recommend_brokers`: reads the case, its stored preferences, and active
 *   `broker_profiles`, applies deterministic filters (same destination
 *   country, overlapping preferred area, budget within range, matching
 *   apartment type, active only), and returns up to 10 candidates plus a
 *   compact preference summary. Persists the shortlist to
 *   `broker_recommendations`.
 * - `HousingService.prepareBrokerRankingPrompt()`: converts preferences and
 *   candidates into a structured JSON payload for a downstream ranking
 *   stage. It prepares data only and never calls a model.
 *
 * Collections owned: `broker_profiles` (read-only here),
 * `housing_preferences`, `broker_recommendations`.
 *
 * Explicitly out of scope for this slice: any LLM provider, ranking,
 * scoring, broker assignment, approvals, notifications, Qdrant, RAG,
 * Firecrawl, RabbitMQ, and n8n.
 *
 * TODO(housing): MongoService is registered here because this is its only
 * consumer. Promote it to a shared infrastructure module once a second
 * module needs MongoDB, so the connection is owned in one place
 * (docs/ARCHITECTURE.md §7 "Integration Adapter Services").
 * TODO(housing): broker profile creation and maintenance belong to the
 * Broker Module (docs/MODULES.md §3.6) and are not implemented here — this
 * slice only reads `broker_profiles`.
 * TODO(housing): a recommendation is advisory. Human approval is mandatory
 * before broker assignment (docs/MODULES.md §46); no tool here may select,
 * assign, or imply assignment of a broker.
 */
@Module({
    name: 'housing',
    description: 'Housing Module (fifth vertical slice): MongoDB-backed housing preference capture and deterministic broker shortlisting. No LLM, ranking, or assignment.',
    imports: [CaseModule],
    controllers: [HousingTools],
    providers: [MongoService, HousingService]
})
export class HousingModule { }
