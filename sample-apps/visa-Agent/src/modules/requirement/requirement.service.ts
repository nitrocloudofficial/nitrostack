import { Injectable } from '@nitrostack/core';

/**
 * [HLD] Dynamic Requirement Resolution + Policy Knowledge Base
 * [STATUS: IMPLEMENTED seeded resolver; live policy scrape/RAG cache is STUB]
 * ------------------------------------------------------------------
 * Responsibility: resolve `(destination × visaType × profile)` into the
 * client's exact checklist. Requirements are not a fixed global list.
 *
 * Target cache-miss flow: locate an official government/embassy source,
 * scrape it asynchronously, chunk/embed it, and upsert Qdrant payloads
 * tagged by country, visa type, source URL, and scrape time. On a cache hit,
 * return the previously resolved result without re-scraping. The same policy
 * KB is shared with the RAG chatbot; this prevents a duplicate knowledge
 * pipeline. Redis caches slow-changing rule sets, never live approval state.
 *
 * This slice deliberately uses a reviewed-for-demo in-memory dataset rather
 * than claiming live official policy retrieval.
 * [/HLD]
 */
export interface RequirementQuery {
    nationality: string;
    destinationCountry: string;
    visaType: string;
}

/**
 * The full shape returned by a single dataset rule.
 */
export interface RequirementRule {
    requiredDocuments: string[];
    estimatedTimeline: string;
    applicationSteps: string[];
    specialNotes: string[];
}

/**
 * A resolved rule, cached per case. This is what
 * `case://requirements/{caseId}` reads back.
 */
export interface RequirementSummary extends RequirementRule {
    caseId: string;
    nationality: string;
    destinationCountry: string;
    visaType: string;
    generatedAt: string;
}

/**
 * TODO(requirement): country name normalization is intentionally tiny and
 * hand-maintained. Replace with an authoritative jurisdiction reference
 * (the Policy Knowledge Module's jurisdiction data, docs/MODULES.md §3.5 /
 * docs/RESOURCES.md `policy://jurisdiction/{destination}`) once it exists.
 */
const COUNTRY_ALIASES: Record<string, string> = {
    usa: 'united states',
    us: 'united states',
    'u.s.': 'united states',
    'u.s.a.': 'united states',
    'united states of america': 'united states',
    'united states': 'united states',
    uk: 'united kingdom',
    'united kingdom': 'united kingdom',
    germany: 'germany',
    canada: 'canada',
    india: 'india'
};

/**
 * TODO(requirement): visa type normalization is a tiny hand-maintained
 * synonym map, not a real taxonomy. Replace once the Visa Case Module
 * defines a canonical visaType enum/schema.
 */
const VISA_TYPE_ALIASES: Record<string, string> = {
    student: 'student', study: 'student', studies: 'student', studying: 'student',
    masters: 'student', "master's": 'student', bachelor: 'student', bachelors: 'student',
    work: 'work', employment: 'work', job: 'work'
};

function normalizeCountry(value: string): string {
    const cleaned = value.trim().toLowerCase().replace(/\.+/g, '');
    return COUNTRY_ALIASES[cleaned] || cleaned;
}

function normalizeVisaType(value: string): string {
    const cleaned = value.trim().toLowerCase();
    return VISA_TYPE_ALIASES[cleaned] || cleaned;
}

function ruleKey(nationality: string, destinationCountry: string, visaType: string): string {
    return `${normalizeCountry(nationality)}|${normalizeCountry(destinationCountry)}|${normalizeVisaType(visaType)}`;
}

/**
 * Small hardcoded rules dataset.
 *
 * TODO(requirement): this is illustrative sample data for the vertical
 * slice only — it is NOT verified embassy/consular guidance and must not
 * be presented to end users as authoritative. Replace with the real
 * Policy Knowledge Module (Qdrant-backed, Firecrawl-sourced, reviewed and
 * attributed per docs/MODULES.md §3.5 and docs/RESOURCES.md) before any
 * production use. See also docs/PROMPTS.md "Policy Retrieval" safety
 * rules: cite sources, surface freshness/uncertainty, never state a
 * guaranteed outcome.
 */
const REQUIREMENT_DATASET: Record<string, RequirementRule> = {
    [ruleKey('india', 'germany', 'student')]: {
        requiredDocuments: [
            'Valid passport',
            'University admission/enrollment letter',
            'Proof of financial resources (e.g., blocked account)',
            'Health insurance',
            'Academic transcripts and certificates',
            'Letter of motivation',
            'Completed visa application form',
            'Biometric photos'
        ],
        estimatedTimeline: '6-12 weeks for appointment scheduling and processing',
        applicationSteps: [
            'Receive university admission letter',
            'Open a blocked bank account for proof of funds',
            'Book a visa appointment at the German consulate',
            'Submit application with required documents',
            'Attend visa interview',
            'Await decision'
        ],
        specialNotes: [
            'Requirements vary by German consulate jurisdiction and can change without notice.',
            'This is illustrative sample data, not verified embassy guidance.'
        ]
    },
    [ruleKey('india', 'germany', 'work')]: {
        requiredDocuments: [
            'Valid passport',
            'Signed employment contract or job offer',
            'Recognized professional qualification/degree',
            'Proof of qualification recognition (if applicable)',
            'Health insurance',
            'Completed visa application form',
            'Biometric photos'
        ],
        estimatedTimeline: '4-10 weeks depending on visa category',
        applicationSteps: [
            'Secure a job offer from a German employer',
            'Check qualification recognition requirements',
            'Book a visa appointment',
            'Submit application with employer-provided documents',
            'Attend visa interview',
            'Await decision'
        ],
        specialNotes: [
            'Some work visa categories have minimum salary thresholds that change periodically.',
            'This is illustrative sample data, not verified embassy guidance.'
        ]
    },
    [ruleKey('india', 'united states', 'student')]: {
        requiredDocuments: [
            'Valid passport',
            'Form I-20 from a SEVP-certified school',
            'SEVIS I-901 fee payment receipt',
            'DS-160 confirmation page',
            'Proof of financial support',
            'Academic transcripts and standardized test scores'
        ],
        estimatedTimeline: '3-8 weeks including interview wait times (varies significantly by consulate)',
        applicationSteps: [
            'Receive Form I-20 from the school',
            'Pay the SEVIS I-901 fee',
            'Complete the DS-160 online form',
            'Pay the visa application fee',
            'Schedule and attend the visa interview',
            'Await decision'
        ],
        specialNotes: [
            'Interview wait times vary widely by consulate location and season.',
            'This is illustrative sample data, not verified embassy guidance.'
        ]
    },
    [ruleKey('india', 'canada', 'student')]: {
        requiredDocuments: [
            'Valid passport',
            'Letter of acceptance from a Designated Learning Institution (DLI)',
            'Proof of financial support (e.g., GIC or bank statements)',
            'Proof of paid tuition (if applicable)',
            'Statement of purpose',
            'Passport-size photos'
        ],
        estimatedTimeline: '4-12 weeks depending on visa office workload',
        applicationSteps: [
            'Receive letter of acceptance from a DLI',
            'Arrange proof of funds (e.g., GIC)',
            'Complete the online study permit application',
            'Submit biometrics',
            'Complete a medical exam if required',
            'Await decision'
        ],
        specialNotes: [
            'Study permit processing times fluctuate; check the official immigration authority for current estimates.',
            'This is illustrative sample data, not verified embassy guidance.'
        ]
    }
};

/**
 * RequirementService
 *
 * Third vertical slice: determines visa requirements from nationality,
 * destinationCountry, and visaType using a small in-memory hardcoded
 * dataset (REQUIREMENT_DATASET). No database, no vector store, no web
 * scraping, no LLM call anywhere in this class.
 *
 * Also owns a small in-memory per-case cache so
 * `case://requirements/{caseId}` can return "the latest generated
 * requirement summary" without recomputing or persisting anything.
 *
 * TODO(requirement): replace REQUIREMENT_DATASET with the real Policy
 * Knowledge Module (docs/MODULES.md §3.5): Qdrant retrieval, Firecrawl
 * ingestion, source attribution, freshness/review state. This service's
 * public method shapes (RequirementQuery -> RequirementRule) are designed
 * so callers should not need to change when that happens.
 * TODO(requirement): the per-case cache is process-memory only and is lost
 * on restart, exactly like VisaCaseService. Replace with the MongoDB-backed
 * read model described in docs/RESOURCES.md when persistence is added.
 */
@Injectable()
export class RequirementService {
    private readonly cacheByCaseId = new Map<string, RequirementSummary>();

    /**
     * Look up a rule for the given query. Throws when no rule exists for
     * the combination — this is a small hardcoded dataset, not a general
     * knowledge base.
     *
     * TODO(requirement): normalize this into a stable application error
     * (e.g. RequirementNotFoundError) once the error taxonomy from
     * docs/ARCHITECTURE.md §16 exists, instead of a plain Error.
     */
    resolveRequirements(query: RequirementQuery): RequirementRule {
        const key = ruleKey(query.nationality, query.destinationCountry, query.visaType);
        const rule = REQUIREMENT_DATASET[key];
        if (!rule) {
            throw new Error(
                `No requirement rule found for nationality="${query.nationality}", ` +
                `destinationCountry="${query.destinationCountry}", visaType="${query.visaType}". ` +
                'Only a small hardcoded dataset is supported in this slice.'
            );
        }
        return rule;
    }

    /**
     * [LLD] resolve_requirements(country, visaType, profile) — target behavior
     * - Cache key: `req:{country}:{visaType}`. On miss, if no policy chunks
     *   exist, enqueue an async scrape and return a calm `resolving` state.
     * - Otherwise shape retrieved rules into categorised checklist items
     *   `{ id, label, required, formatRules, expiryRule }`, apply profile
     *   branching, cache, and return.
     * - A mid-case visa-type change invalidates that case's resolved result;
     *   stale or unreachable policy is surfaced to ops rather than fabricated.
     *
     * Current implementation resolves and caches the supported fixture rule
     * per case; no Redis, Qdrant, scraper, profile branching, or async task.
     *
     * Resolves requirements for a case and caches the result under its
     * caseId so the resource can read it back later. Called by
     * `resolve_requirements`.
     */
    resolveAndCacheForCase(caseId: string, query: RequirementQuery): RequirementSummary {
        const rule = this.resolveRequirements(query);
        const summary: RequirementSummary = {
            caseId,
            nationality: query.nationality,
            destinationCountry: query.destinationCountry,
            visaType: query.visaType,
            ...rule,
            generatedAt: new Date().toISOString()
        };
        this.cacheByCaseId.set(caseId, summary);
        return summary;
    }

    /**
     * Returns the most recently generated summary for a case, or undefined
     * if `resolve_requirements` has never been run for it. Read-only, no
     * side effects — safe for the resource to call repeatedly.
     */
    getCachedSummary(caseId: string): RequirementSummary | undefined {
        return this.cacheByCaseId.get(caseId);
    }
}
