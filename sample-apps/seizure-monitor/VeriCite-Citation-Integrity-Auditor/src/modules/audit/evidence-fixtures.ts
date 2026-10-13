// src/modules/audit/evidence-fixtures.ts

/**
 * ============================================================
 * VeriCite — Offline Evidence Fixtures
 * ------------------------------------------------------------
 * Recorded scholarly records used when VERICITE_OFFLINE=true.
 *
 * This is INFRASTRUCTURE, not demo content. Its purpose is to keep
 * the pipeline deterministic and runnable with no network — for
 * tests, for CI, and as a fallback when live providers are
 * unreachable. Curated demo corpora are a later phase.
 *
 * Honesty guarantees:
 *   • Every record is emitted with provider "Fixture", which
 *     propagates into `VerificationResult.metadata.source` and is
 *     therefore visible in the report and the widget.
 *   • `AuditReport.offlineMode` is set to true for the whole run.
 *   • A claim matching no fixture returns NO evidence, exactly as a
 *     live provider miss would. Fixtures never fabricate a match.
 * ============================================================
 */

export interface FixtureRecord {
    /** Lower-case topic keywords; a claim must share one to match. */
    keywords: string[];
    title: string;
    authors: string[];
    year: number;
    journal: string;
    doi: string;
    url?: string;
    abstract: string;
    citationCount: number;
    retracted: boolean;
}

export const EVIDENCE_FIXTURES: readonly FixtureRecord[] = [
    {
        keywords: ['climate', 'warming', 'temperature', 'greenhouse', 'emissions', 'anthropogenic'],
        title: 'Attribution of observed global surface warming to anthropogenic forcing',
        authors: ['Hegerl, G.', 'Zwiers, F.'],
        year: 2021,
        journal: 'Nature Climate Change',
        doi: '10.1038/s41558-021-01000-0',
        abstract:
            'Observed global mean surface temperature has increased substantially since the pre-industrial period. '
            + 'Detection and attribution analyses show that the increase is dominated by anthropogenic greenhouse gas '
            + 'emissions. Natural forcings alone cannot explain the observed warming trend of approximately 1.1 degrees.',
        citationCount: 1840,
        retracted: false,
    },
    {
        keywords: ['transformer', 'attention', 'language', 'neural', 'model', 'sequence'],
        title: 'Attention mechanisms in sequence transduction models',
        authors: ['Vaswani, A.', 'Shazeer, N.', 'Parmar, N.'],
        year: 2017,
        journal: 'Advances in Neural Information Processing Systems',
        doi: '10.5555/3295222.3295349',
        abstract:
            'We propose a network architecture based solely on attention mechanisms, dispensing with recurrence and '
            + 'convolutions entirely. Experiments show the model is superior in quality while being more parallelisable '
            + 'and requiring significantly less time to train. The approach improves BLEU score on translation tasks.',
        citationCount: 98000,
        retracted: false,
    },
    {
        keywords: ['vaccine', 'autism', 'immunisation', 'immunization', 'mmr'],
        title: 'Ileal-lymphoid-nodular hyperplasia and developmental disorder in children',
        authors: ['Wakefield, A.'],
        year: 1998,
        journal: 'The Lancet',
        doi: '10.1016/S0140-6736(97)11096-0',
        abstract:
            'This work proposed an association between immunisation and developmental regression. The paper was '
            + 'subsequently retracted in full. Large-scale epidemiological studies found no association between '
            + 'vaccination and autism, and did not support the proposed causal link.',
        citationCount: 4200,
        retracted: true,
    },
    {
        keywords: ['vaccine', 'autism', 'epidemiology', 'cohort', 'immunisation', 'immunization'],
        title: 'Nationwide cohort study of measles vaccination and autism risk',
        authors: ['Hviid, A.', 'Hansen, J.'],
        year: 2019,
        journal: 'Annals of Internal Medicine',
        doi: '10.7326/M18-2101',
        abstract:
            'In a nationwide cohort of more than 650 000 children we found no evidence that vaccination increases '
            + 'the risk of autism. The study does not support a causal association, and found no difference in '
            + 'incidence between vaccinated and unvaccinated subgroups.',
        citationCount: 1100,
        retracted: false,
    },
    {
        keywords: ['deep', 'learning', 'diagnosis', 'medical', 'imaging', 'radiology', 'accuracy'],
        title: 'Diagnostic accuracy of deep learning in medical imaging: a systematic review',
        authors: ['Liu, X.', 'Faes, L.', 'Kale, A.'],
        year: 2019,
        journal: 'The Lancet Digital Health',
        doi: '10.1016/S2589-7500(19)30123-2',
        abstract:
            'Deep learning models achieved a pooled sensitivity of 87 percent and specificity of 93 percent, '
            + 'comparable to health-care professionals. However, few studies presented externally validated results, '
            + 'and reporting quality was poor. Claims of superior performance should be interpreted with caution.',
        citationCount: 3300,
        retracted: false,
    },
    {
        keywords: ['sea', 'level', 'ice', 'glacier', 'antarctic', 'greenland', 'melt'],
        title: 'Mass balance of the Greenland and Antarctic ice sheets',
        authors: ['Shepherd, A.', 'Ivins, E.'],
        year: 2020,
        journal: 'Nature',
        doi: '10.1038/s41586-020-2591-3',
        abstract:
            'Satellite observations show that ice sheet mass loss has increased over recent decades, contributing '
            + 'to global sea level rise. Combined losses raised sea level by approximately 18 millimetres since 1992.',
        citationCount: 2100,
        retracted: false,
    },
    {
        keywords: ['reproducibility', 'replication', 'psychology', 'crisis', 'significance'],
        title: 'Estimating the reproducibility of psychological science',
        authors: ['Open Science Collaboration'],
        year: 2015,
        journal: 'Science',
        doi: '10.1126/science.aac4716',
        abstract:
            'We conducted replications of 100 experimental studies. Whereas 97 percent of original studies reported '
            + 'significant results, only 36 percent of replications did. The findings decreased in effect size, '
            + 'indicating that reproducibility is lower than commonly assumed.',
        citationCount: 8600,
        retracted: false,
    },
    {
        keywords: ['antibiotic', 'resistance', 'bacteria', 'antimicrobial', 'infection'],
        title: 'Global burden of bacterial antimicrobial resistance',
        authors: ['Murray, C.', 'Ikuta, K.'],
        year: 2022,
        journal: 'The Lancet',
        doi: '10.1016/S0140-6736(21)02724-0',
        abstract:
            'We estimate that bacterial antimicrobial resistance was directly responsible for 1.27 million deaths '
            + 'in 2019. Resistance increased across most pathogen-drug combinations examined, and the burden was '
            + 'highest in low-resource settings.',
        citationCount: 7400,
        retracted: false,
    },
];
