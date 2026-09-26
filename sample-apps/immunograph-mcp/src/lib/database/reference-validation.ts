import { z } from 'zod';

const identifier = z.string().trim().min(1);
const version = z.string().regex(/^[a-z0-9][a-z0-9.-]{0,99}$/i);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const oneLetter = z.string().regex(/^[A-Z]$/);
const unitInterval = z.number().finite().min(0).max(1);
const positiveInteger = z.number().int().positive();
const sourceUrl = z.string().url();

function addDuplicateIssues(
  values: readonly string[],
  context: z.RefinementCtx,
  label: string,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.trim().toUpperCase();
    if (seen.has(normalized)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate ${label}: ${value}` });
    }
    seen.add(normalized);
  }
}

export const referenceManifestEntrySchema = z
  .object({
    id: identifier,
    version,
    path: z.string().regex(/^[a-z0-9][a-z0-9.-]*\.json$/i),
    sha256,
    sourceName: identifier,
    sourceUrl,
    retrievedAt: z.string().datetime({ offset: true }),
    license: identifier,
    transformationScript: identifier.optional(),
    transformationVersion: version.optional(),
    reviewedBy: identifier,
    notes: z.string().min(1).optional(),
  })
  .strict();

export const referenceManifestSchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    bundleVersion: z.literal('v1'),
    entries: z.array(referenceManifestEntrySchema).length(6),
  })
  .strict()
  .superRefine((value, context) => {
    addDuplicateIssues(
      value.entries.map((entry) => entry.id),
      context,
      'manifest ID',
    );
    addDuplicateIssues(
      value.entries.map((entry) => entry.path),
      context,
      'manifest path',
    );
  });

export const aminoAcidRecordSchema = z
  .object({
    oneLetter,
    threeLetter: z.string().regex(/^[A-Z][a-z]{2}$/),
    name: identifier,
    standard: z.boolean(),
    allowedInStrictProfile: z.boolean(),
  })
  .strict()
  .refine((value) => !value.allowedInStrictProfile || value.standard, {
    message: 'strict-profile residues must be standard amino acids',
  });

export const aminoAcidDictionarySchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    id: z.literal('amino-acids'),
    version: z.literal('v1'),
    sourceKind: z.literal('PUBLIC_REFERENCE'),
    scientificUse: z.literal(true),
    residues: z.array(aminoAcidRecordSchema).min(20),
  })
  .strict()
  .superRefine((value, context) => {
    addDuplicateIssues(
      value.residues.map((residue) => residue.oneLetter),
      context,
      'amino-acid symbol',
    );
    const strictAlphabet = value.residues
      .filter((residue) => residue.standard && residue.allowedInStrictProfile)
      .map((residue) => residue.oneLetter)
      .sort()
      .join('');
    if (strictAlphabet !== 'ACDEFGHIKLMNPQRSTVWY') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'strict profile must contain exactly the 20 standard amino acids',
      });
    }
  });

export const fastaValidationRulesSchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    id: z.literal('fasta-validation-rules'),
    version: z.literal('v1'),
    sourceKind: z.literal('CONFIGURATION'),
    scientificUse: z.literal(false),
    strictAlphabet: z.array(oneLetter).length(20),
    ambiguousResidues: z.array(oneLetter).min(1),
    nonStandardResidues: z.array(oneLetter),
    requireSingleRecord: z.literal(true),
    requireHeader: z.literal(true),
    allowWhitespace: z.literal(true),
    stripSingleTerminalStop: z.literal(true),
    maxBytes: positiveInteger,
    maxResidues: positiveInteger,
  })
  .strict()
  .superRefine((value, context) => {
    addDuplicateIssues(value.strictAlphabet, context, 'strict alphabet residue');
    addDuplicateIssues(value.ambiguousResidues, context, 'ambiguous residue');
    addDuplicateIssues(value.nonStandardResidues, context, 'non-standard residue');
    if ([...value.strictAlphabet].sort().join('') !== 'ACDEFGHIKLMNPQRSTVWY') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'strict FASTA alphabet must contain exactly the 20 standard amino acids',
      });
    }
  });

const populationFrequencySchema = z
  .object({
    populationId: z.string().regex(/^synthetic:[a-z0-9-]+$/),
    value: unitInterval,
    frequencyType: z.enum(['GENOTYPIC', 'ALLELIC']),
    sourceId: z.string().regex(/^urn:immunograph:synthetic:[a-z0-9:-]+$/),
    sourceKind: z.literal('SYNTHETIC'),
    scientificUse: z.literal(false),
  })
  .strict();

const hlaSupportSchema = z
  .object({
    connectorId: identifier,
    method: identifier,
    methodVersion: version,
    peptideLengths: z.array(positiveInteger).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.peptideLengths).size !== value.peptideLengths.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'duplicate peptide length' });
    }
  });

export const hlaAlleleRecordSchema = z
  .object({
    allele: z.string().regex(/^HLA-[A-Z0-9]+\*[0-9]{2,3}:[0-9]{2,3}$/),
    mhcClass: z.enum(['I', 'II']),
    locus: z.string().regex(/^HLA-[A-Z0-9]+$/),
    aliases: z.array(identifier),
    supportedBy: z.array(hlaSupportSchema).min(1),
    populationFrequencies: z.array(populationFrequencySchema).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    addDuplicateIssues(value.aliases, context, 'HLA alias');
    const supportKeys = value.supportedBy.map((support) =>
      `${support.connectorId}|${support.method}|${support.methodVersion}`.toUpperCase(),
    );
    addDuplicateIssues(supportKeys, context, 'HLA method support');
    if (value.populationFrequencies) {
      addDuplicateIssues(
        value.populationFrequencies.map((frequency) => frequency.populationId),
        context,
        'HLA population frequency',
      );
    }
  });

export const hlaRegistrySchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    id: z.literal('hla-alleles'),
    version: z.literal('synthetic-v1'),
    sourceKind: z.literal('PUBLIC_REFERENCE_WITH_SYNTHETIC_AGGREGATES'),
    scientificUse: z.literal(false),
    nomenclatureSourceUrl: sourceUrl,
    frequencyDisclaimer: z.string().min(1),
    alleles: z.array(hlaAlleleRecordSchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const names: string[] = [];
    for (const allele of value.alleles) names.push(allele.allele, ...allele.aliases);
    addDuplicateIssues(names, context, 'HLA allele or alias');
  });

const normalizationTransformationSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('IDENTITY'),
      min: z.literal(0),
      max: z.literal(1),
      direction: z.literal('HIGHER_BETTER'),
    })
    .strict(),
  z.object({ kind: z.literal('INVERSE_PERCENTILE'), cap: z.number().finite().positive() }).strict(),
]);

const normalizationProfileSchema = z
  .object({
    id: identifier,
    connectorId: identifier,
    method: identifier,
    methodVersion: version,
    field: identifier,
    rawUnit: identifier,
    direction: z.enum(['LOWER_BETTER', 'HIGHER_BETTER']),
    validRawDomain: z
      .object({ minimum: z.number().finite(), maximum: z.number().finite() })
      .strict()
      .refine((domain) => domain.maximum > domain.minimum, 'maximum must exceed minimum'),
    transformation: normalizationTransformationSchema,
    sourceUrl,
  })
  .strict();

export const normalizationRegistrySchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    id: z.literal('normalization-profiles'),
    version: z.literal('v1'),
    sourceKind: z.literal('CONFIGURATION'),
    scientificUse: z.literal(false),
    profiles: z.array(normalizationProfileSchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    addDuplicateIssues(
      value.profiles.map((profile) => profile.id),
      context,
      'normalization profile ID',
    );
  });

const connectorMethodSchema = z
  .object({
    method: identifier,
    methodVersion: version,
    tracks: z.array(z.enum(['MHCI', 'MHCII', 'BCELL', 'POPULATION_COVERAGE'])).min(1),
    sourceStatuses: z.array(z.enum(['LIVE', 'CACHED', 'SYNTHETIC', 'FIXTURE', 'FAILED'])).min(1),
  })
  .strict();

const connectorSchema = z
  .object({
    connectorId: identifier,
    connectorVersion: version,
    displayName: identifier,
    enabledByDefault: z.boolean(),
    fixtureOnly: z.boolean(),
    syntheticOnly: z.boolean().default(false),
    sourceUrl,
    methods: z.array(connectorMethodSchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const methodKeys = value.methods.map((method) =>
      `${method.method}|${method.methodVersion}`.toUpperCase(),
    );
    addDuplicateIssues(methodKeys, context, 'connector method');
    if (
      value.fixtureOnly &&
      value.methods.some((method) =>
        method.sourceStatuses.some((status) => status === 'LIVE' || status === 'CACHED'),
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'fixture-only connectors cannot advertise LIVE or CACHED',
      });
    }
    if (
      value.syntheticOnly &&
      value.methods.some((method) => method.sourceStatuses.some((status) => status !== 'SYNTHETIC'))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'synthetic-only connectors can advertise only SYNTHETIC',
      });
    }
  });

export const connectorRegistrySchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    id: z.literal('connector-registry'),
    version: z.literal('v1'),
    sourceKind: z.literal('CONFIGURATION'),
    scientificUse: z.literal(false),
    connectors: z.array(connectorSchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    addDuplicateIssues(
      value.connectors.map((connector) => connector.connectorId),
      context,
      'connector ID',
    );
  });

const demoProteinSchema = z
  .object({
    id: identifier,
    displayName: identifier,
    sequence: z.string().regex(/^[ACDEFGHIKLMNPQRSTVWY]+$/),
    sha256,
    fixtureId: identifier.optional(),
  })
  .strict();

export const demoProteinRegistrySchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    id: z.literal('demo-proteins'),
    version: z.literal('synthetic-v1'),
    sourceKind: z.literal('SYNTHETIC'),
    scientificUse: z.literal(false),
    disclaimer: z.string().min(1),
    proteins: z.array(demoProteinSchema).min(5).max(10),
  })
  .strict()
  .superRefine((value, context) => {
    addDuplicateIssues(
      value.proteins.map((protein) => protein.id),
      context,
      'demo protein ID',
    );
    addDuplicateIssues(
      value.proteins.map((protein) => protein.sha256),
      context,
      'demo protein hash',
    );
  });

export type ReferenceManifest = z.infer<typeof referenceManifestSchema>;
export type AminoAcidDictionary = z.infer<typeof aminoAcidDictionarySchema>;
export type FastaValidationRules = z.infer<typeof fastaValidationRulesSchema>;
export type HlaAlleleRecord = z.infer<typeof hlaAlleleRecordSchema>;
export type HlaRegistry = z.infer<typeof hlaRegistrySchema>;
export type NormalizationRegistry = z.infer<typeof normalizationRegistrySchema>;
export type ConnectorRegistry = z.infer<typeof connectorRegistrySchema>;
export type DemoProteinRegistry = z.infer<typeof demoProteinRegistrySchema>;
