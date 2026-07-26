import { Injectable } from '@nitrostack/core';

/**
 * Fields the Onboarding Module tries to extract from a free-form message.
 * Any field may be `null` when the heuristics below found no confident match.
 */
export interface OnboardingExtractionResult {
    nationality: string | null;
    destinationCountry: string | null;
    visaType: string | null;
}

/**
 * TODO(onboarding): this is a small, intentionally non-exhaustive reference
 * list used only to normalize casing and validate that a captured phrase
 * looks like a real country name. Replace with an authoritative
 * country/jurisdiction reference (e.g. the Policy Knowledge Module's
 * jurisdiction data, docs/RESOURCES.md `policy://jurisdiction/{destination}`)
 * once it exists.
 */
const KNOWN_COUNTRIES: string[] = [
    'United States', 'United Kingdom', 'United Arab Emirates', 'New Zealand',
    'South Africa', 'South Korea', 'Saudi Arabia', 'Sri Lanka',
    'India', 'Germany', 'France', 'Canada', 'Australia', 'Japan', 'China',
    'Italy', 'Spain', 'Netherlands', 'Ireland', 'Singapore', 'Switzerland',
    'Sweden', 'Norway', 'Denmark', 'Finland', 'Portugal', 'Austria',
    'Belgium', 'Mexico', 'Brazil', 'Argentina', 'Pakistan', 'Bangladesh',
    'Nepal', 'Philippines', 'Vietnam', 'Thailand', 'Malaysia', 'Indonesia',
    'Poland', 'Greece', 'Turkey', 'Russia', 'Nigeria', 'Kenya', 'Egypt',
    'Israel', 'Qatar', 'Kuwait'
];

/**
 * TODO(onboarding): demonym -> country mapping, also intentionally small.
 * Lets the parser understand phrasing like "I'm Indian" or "I am a German
 * citizen" in addition to "I am from India".
 */
const DEMONYM_TO_COUNTRY: Record<string, string> = {
    american: 'United States', british: 'United Kingdom', emirati: 'United Arab Emirates',
    indian: 'India', german: 'Germany', french: 'France', canadian: 'Canada',
    australian: 'Australia', japanese: 'Japan', chinese: 'China', italian: 'Italy',
    spanish: 'Spain', dutch: 'Netherlands', irish: 'Ireland', singaporean: 'Singapore',
    swiss: 'Switzerland', swedish: 'Sweden', norwegian: 'Norway', danish: 'Denmark',
    finnish: 'Finland', portuguese: 'Portugal', austrian: 'Austria', belgian: 'Belgium',
    mexican: 'Mexico', brazilian: 'Brazil', argentine: 'Argentina', pakistani: 'Pakistan',
    bangladeshi: 'Bangladesh', nepali: 'Nepal', filipino: 'Philippines', vietnamese: 'Vietnam',
    thai: 'Thailand', malaysian: 'Malaysia', indonesian: 'Indonesia', polish: 'Poland',
    greek: 'Greece', turkish: 'Turkey', russian: 'Russia', nigerian: 'Nigeria',
    kenyan: 'Kenya', egyptian: 'Egypt', israeli: 'Israel', qatari: 'Qatar', kuwaiti: 'Kuwait'
};

/**
 * Visa type keyword heuristics, ordered by priority (first category with a
 * matching keyword wins). Deliberately simple substring/word matching, not
 * an eligibility or legal determination of any kind.
 */
const VISA_TYPE_KEYWORDS: Array<{ visaType: string; keywords: string[] }> = [
    {
        visaType: 'Student',
        keywords: ['master', 'masters', "master's", 'msc', 'phd', 'doctorate', 'bachelor',
            'bachelors', 'undergrad', 'undergraduate', 'postgraduate', 'study', 'studies',
            'studying', 'student', 'university', 'college', 'academic', 'course']
    },
    {
        visaType: 'Work',
        keywords: ['work', 'job', 'employment', 'employer', 'employed', 'working', 'career', 'hired']
    },
    {
        visaType: 'Business',
        keywords: ['business', 'conference', 'trade', 'client meeting', 'corporate']
    },
    {
        visaType: 'Family',
        keywords: ['family', 'spouse', 'marriage', 'reunion', 'dependent', 'wife', 'husband', 'partner']
    },
    {
        visaType: 'Tourist',
        keywords: ['tourist', 'tourism', 'vacation', 'holiday', 'visiting', 'visit', 'sightseeing', 'travel']
    }
];

/**
 * OnboardingExtractionService
 *
 * Deterministic, regex/heuristic-based extraction of onboarding fields from
 * a free-form message. No LLM, no network call, no external dependency.
 *
 * TODO(onboarding): this is intentionally a stand-in for real natural
 * language understanding. Future work should add an LLM-backed extraction
 * path (see module-level TODOs in onboarding.module.ts) behind the same
 * OnboardingExtractionResult contract so callers do not need to change.
 */
@Injectable()
export class OnboardingExtractionService {
    extract(message: string): OnboardingExtractionResult {
        return {
            nationality: this.extractNationality(message),
            destinationCountry: this.extractDestinationCountry(message),
            visaType: this.extractVisaType(message)
        };
    }

    private extractNationality(message: string): string |null {

    const lower = message.toLowerCase();

    if (lower.includes("from")) {

        for (const country of KNOWN_COUNTRIES){

            if(lower.includes("from " + country.toLowerCase())){

                return country;

            }

        }

    }

    for(const [demonym,country] of Object.entries(DEMONYM_TO_COUNTRY)){

        if(lower.includes(demonym)){

            return country;

        }

    }

    return null;
}

    private extractDestinationCountry(message: string): string | null {
        // "moving to Germany", "relocating to France", "migrating to Canada",
        // "going to Japan", "travel(l)ing to Spain", "move to Italy"
        const anchoredMatch = message.match(
            /\b(?:moving to|relocating to|migrating to|immigrating to|move to|going to|travel(?:l?ing)? to)\s+([a-z][a-z\s]*?)(?=[.,;!?]|\s+(?:for|to|because|as|so|in order)\b|$)/i
        );
        if (anchoredMatch) {
            const normalized = this.normalizeCountryPhrase(anchoredMatch[1]);
            if (normalized) return normalized;
        }

        return null;
    }

    private extractVisaType(message: string): string | null {
        const lower = message.toLowerCase();
        for (const category of VISA_TYPE_KEYWORDS) {
            if (category.keywords.some(keyword => lower.includes(keyword))) {
                return category.visaType;
            }
        }
        return null;
    }

    /**
     * Trims a captured phrase and, when possible, maps it to the canonical
     * capitalization of a known country. Returns null when the phrase does
     * not look like a recognizable country at all (keeps false positives
     * out of the result rather than guessing).
     */
    private normalizeCountryPhrase(rawPhrase: string): string | null {
        const cleaned = rawPhrase.trim().replace(/[.,!?;:]+$/, '');
        if (!cleaned) return null;

        const lower = cleaned.toLowerCase();

        const directMatch = KNOWN_COUNTRIES.find(country => country.toLowerCase() === lower);
        if (directMatch) return directMatch;

        const demonymMatch = DEMONYM_TO_COUNTRY[lower];
        if (demonymMatch) return demonymMatch;

        // TODO(onboarding): unknown-but-plausible phrases (e.g. countries not
        // in KNOWN_COUNTRIES) are currently rejected rather than guessed, to
        // avoid returning garbage captured from unrelated sentence
        // fragments. Expand KNOWN_COUNTRIES or replace this with a real
        // reference dataset instead of loosening this check.
        return null;
    }
}
