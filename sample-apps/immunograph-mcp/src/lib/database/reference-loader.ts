import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { z } from 'zod';

import {
  aminoAcidDictionarySchema,
  connectorRegistrySchema,
  demoProteinRegistrySchema,
  fastaValidationRulesSchema,
  hlaRegistrySchema,
  normalizationRegistrySchema,
  referenceManifestSchema,
  type AminoAcidDictionary,
  type ConnectorRegistry,
  type DemoProteinRegistry,
  type FastaValidationRules,
  type HlaAlleleRecord,
  type HlaRegistry,
  type NormalizationRegistry,
  type ReferenceManifest,
} from './reference-validation.js';

export const DEFAULT_REFERENCE_DIRECTORY = fileURLToPath(
  new URL('../../../data/reference/', import.meta.url),
);

const referenceFiles = {
  'amino-acids': {
    path: 'amino-acids.v1.json',
    schema: aminoAcidDictionarySchema,
  },
  'fasta-validation-rules': {
    path: 'fasta-validation-rules.v1.json',
    schema: fastaValidationRulesSchema,
  },
  'hla-alleles': {
    path: 'hla-alleles.synthetic-v1.json',
    schema: hlaRegistrySchema,
  },
  'normalization-profiles': {
    path: 'normalization-profiles.v1.json',
    schema: normalizationRegistrySchema,
  },
  'connector-registry': {
    path: 'connector-registry.v1.json',
    schema: connectorRegistrySchema,
  },
  'demo-proteins': {
    path: 'demo-proteins.synthetic-v1.json',
    schema: demoProteinRegistrySchema,
  },
} as const;

type ReferenceFileId = keyof typeof referenceFiles;

export interface ReferenceBundle {
  manifest: ReferenceManifest;
  aminoAcids: AminoAcidDictionary;
  fastaRules: FastaValidationRules;
  hlaRegistry: HlaRegistry;
  normalizationProfiles: NormalizationRegistry;
  connectorRegistry: ConnectorRegistry;
  demoProteins: DemoProteinRegistry;
}

export interface HlaSelection {
  allele: string;
  mhcClass: 'I' | 'II';
  connectorId: string;
  method: string;
  methodVersion: string;
  peptideLengths: number[];
}

export type HlaSelectionIssueCode =
  | 'UNSUPPORTED_ALLELE'
  | 'CLASS_MISMATCH'
  | 'UNSUPPORTED_METHOD'
  | 'UNSUPPORTED_METHOD_VERSION'
  | 'UNSUPPORTED_PEPTIDE_LENGTH';

export interface HlaSelectionIssue {
  code: HlaSelectionIssueCode;
  message: string;
  allele: string;
  peptideLength?: number;
}

export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Reference data numbers must be finite');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalizeJson(item)}`)
      .join(',')}}`;
  }
  throw new Error('Reference data contains a non-JSON value');
}

export function computeCanonicalJsonHash(value: unknown): string {
  return createHash('sha256').update(canonicalizeJson(value)).digest('hex');
}

function parseJson(contents: Buffer, path: string): unknown {
  try {
    return JSON.parse(contents.toString('utf8')) as unknown;
  } catch (error) {
    throw new Error(`Invalid JSON in reference file ${path}`, { cause: error });
  }
}

async function loadManifest(directory: string): Promise<ReferenceManifest> {
  const path = join(directory, 'manifest.v1.json');
  return referenceManifestSchema.parse(parseJson(await readFile(path), path));
}

function validateManifestCoverage(manifest: ReferenceManifest): void {
  const expectedIds = Object.keys(referenceFiles).sort();
  const actualIds = manifest.entries.map((entry) => entry.id).sort();
  if (actualIds.join('|') !== expectedIds.join('|')) {
    throw new Error('Reference manifest does not cover the expected reference file IDs');
  }
  for (const [id, descriptor] of Object.entries(referenceFiles)) {
    const entry = manifest.entries.find((candidate) => candidate.id === id);
    if (entry?.path !== descriptor.path) {
      throw new Error(`Reference manifest path mismatch for ${id}`);
    }
  }
}

async function loadManifestEntry<T extends z.ZodTypeAny>(
  directory: string,
  manifest: ReferenceManifest,
  id: ReferenceFileId,
  schema: T,
): Promise<z.infer<T>> {
  const entry = manifest.entries.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Reference manifest entry missing for ${id}`);
  const path = join(directory, entry.path);
  const document = parseJson(await readFile(path), path);
  const actualHash = computeCanonicalJsonHash(document);
  if (actualHash !== entry.sha256) {
    throw new Error(
      `Reference hash mismatch for ${id}: expected ${entry.sha256}, received ${actualHash}`,
    );
  }
  const parsed = schema.parse(document);
  if (parsed.id !== entry.id || parsed.version !== entry.version) {
    throw new Error(`Reference identity mismatch for ${id}`);
  }
  return parsed;
}

export async function loadReferenceBundle(
  directory = DEFAULT_REFERENCE_DIRECTORY,
): Promise<ReferenceBundle> {
  const manifest = await loadManifest(directory);
  validateManifestCoverage(manifest);
  const [
    aminoAcids,
    fastaRules,
    hlaRegistry,
    normalizationProfiles,
    connectorRegistry,
    demoProteins,
  ] = await Promise.all([
    loadManifestEntry(directory, manifest, 'amino-acids', referenceFiles['amino-acids'].schema),
    loadManifestEntry(
      directory,
      manifest,
      'fasta-validation-rules',
      referenceFiles['fasta-validation-rules'].schema,
    ),
    loadManifestEntry(directory, manifest, 'hla-alleles', referenceFiles['hla-alleles'].schema),
    loadManifestEntry(
      directory,
      manifest,
      'normalization-profiles',
      referenceFiles['normalization-profiles'].schema,
    ),
    loadManifestEntry(
      directory,
      manifest,
      'connector-registry',
      referenceFiles['connector-registry'].schema,
    ),
    loadManifestEntry(directory, manifest, 'demo-proteins', referenceFiles['demo-proteins'].schema),
  ]);

  const dictionaryAlphabet = aminoAcids.residues
    .filter((residue) => residue.allowedInStrictProfile)
    .map((residue) => residue.oneLetter)
    .sort()
    .join('');
  if ([...fastaRules.strictAlphabet].sort().join('') !== dictionaryAlphabet) {
    throw new Error('FASTA strict alphabet does not match the amino-acid dictionary');
  }

  for (const protein of demoProteins.proteins) {
    const actualHash = createHash('sha256').update(protein.sequence).digest('hex');
    if (actualHash !== protein.sha256) {
      throw new Error(`Demo protein hash mismatch for ${protein.id}`);
    }
  }

  return {
    manifest,
    aminoAcids,
    fastaRules,
    hlaRegistry,
    normalizationProfiles,
    connectorRegistry,
    demoProteins,
  };
}

function normalizedHlaName(value: string): string {
  return value.trim().toUpperCase();
}

export function findHlaAllele(bundle: ReferenceBundle, input: string): HlaAlleleRecord | null {
  const target = normalizedHlaName(input);
  return (
    bundle.hlaRegistry.alleles.find(
      (record) =>
        normalizedHlaName(record.allele) === target ||
        record.aliases.some((alias) => normalizedHlaName(alias) === target),
    ) ?? null
  );
}

export function validateHlaSelection(
  bundle: ReferenceBundle,
  selection: HlaSelection,
): HlaSelectionIssue[] {
  const allele = findHlaAllele(bundle, selection.allele);
  if (!allele) {
    return [
      {
        code: 'UNSUPPORTED_ALLELE',
        message: `HLA allele ${selection.allele} is not registered`,
        allele: selection.allele,
      },
    ];
  }

  const issues: HlaSelectionIssue[] = [];
  if (allele.mhcClass !== selection.mhcClass) {
    issues.push({
      code: 'CLASS_MISMATCH',
      message: `${allele.allele} is MHC class ${allele.mhcClass}, not ${selection.mhcClass}`,
      allele: allele.allele,
    });
  }

  const matchingMethod = allele.supportedBy.find(
    (support) =>
      support.connectorId === selection.connectorId && support.method === selection.method,
  );
  if (!matchingMethod) {
    issues.push({
      code: 'UNSUPPORTED_METHOD',
      message: `${selection.connectorId}/${selection.method} does not support ${allele.allele}`,
      allele: allele.allele,
    });
    return issues;
  }
  if (matchingMethod.methodVersion !== selection.methodVersion) {
    issues.push({
      code: 'UNSUPPORTED_METHOD_VERSION',
      message: `${selection.connectorId}/${selection.method}@${selection.methodVersion} does not support ${allele.allele}`,
      allele: allele.allele,
    });
    return issues;
  }

  const supportedLengths = new Set(matchingMethod.peptideLengths);
  for (const peptideLength of selection.peptideLengths) {
    if (!supportedLengths.has(peptideLength)) {
      issues.push({
        code: 'UNSUPPORTED_PEPTIDE_LENGTH',
        message: `${allele.allele} does not support peptide length ${peptideLength} for the selected method`,
        allele: allele.allele,
        peptideLength,
      });
    }
  }
  return issues;
}
