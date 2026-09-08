import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeProfileHash } from './profile-loader.js';
import {
  expectedCandidatesSchema,
  expectedFixtureReportSchema,
  fixtureCaseDocumentSchema,
  fixtureManifestSchema,
  fixtureMatchQuerySchema,
  type ExpectedCandidates,
  type ExpectedFixtureReport,
  type FixtureCaseDocument,
  type FixtureManifest,
  type FixtureMatchQuery,
} from './fixture-validation.js';

export const DEFAULT_FIXTURE_DIRECTORY = fileURLToPath(
  new URL('../../../data/fixtures/', import.meta.url),
);

export interface LoadedFixtureCase extends FixtureCaseDocument {
  fasta: { header: string; sequence: string };
  expectedCandidates: ExpectedCandidates;
  expectedReport: ExpectedFixtureReport;
  contentHash: string;
  replayHash: string;
}

export interface LoadedFixtureRegistry {
  manifest: FixtureManifest;
  manifestHash: string;
  cases: LoadedFixtureCase[];
}

type ManifestFile = FixtureManifest['entries'][number]['files']['case'];

function filePathInside(directory: string, relativePath: string): string {
  const root = resolve(directory);
  const target = resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error(`Fixture path escapes registry: ${relativePath}`);
  }
  return target;
}

function sha256Text(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function loadJsonFile(
  directory: string,
  descriptor: ManifestFile,
): Promise<{ document: unknown; hash: string }> {
  const contents = await readFile(filePathInside(directory, descriptor.file), 'utf8');
  const document: unknown = JSON.parse(contents);
  const hash = computeProfileHash(document);
  if (hash !== descriptor.sha256) {
    throw new Error(`Fixture hash mismatch for ${descriptor.file}`);
  }
  return { document, hash };
}

async function loadFastaFile(
  directory: string,
  descriptor: ManifestFile,
): Promise<{ header: string; sequence: string; contents: string }> {
  const contents = await readFile(filePathInside(directory, descriptor.file), 'utf8');
  if (sha256Text(contents.replace(/\r\n/g, '\n')) !== descriptor.sha256) {
    throw new Error(`Fixture hash mismatch for ${descriptor.file}`);
  }
  const normalized = contents.replace(/\r\n/g, '\n').trimEnd();
  const lines = normalized.split('\n');
  if (lines.length < 2 || !lines[0]!.startsWith('>SYNTHETIC_DEMO')) {
    throw new Error(`Fixture FASTA ${descriptor.file} must begin with >SYNTHETIC_DEMO`);
  }
  if (lines.slice(1).some((line) => line.startsWith('>'))) {
    throw new Error(`Fixture FASTA ${descriptor.file} must contain exactly one record`);
  }
  const sequence = lines.slice(1).join('').trim().toUpperCase();
  if (!/^[ACDEFGHIKLMNPQRSTVWY]+$/.test(sequence)) {
    throw new Error(`Fixture FASTA ${descriptor.file} must use the strict 20-residue alphabet`);
  }
  return { header: lines[0]!.slice(1), sequence, contents };
}

function selectorKey(query: FixtureMatchQuery): string {
  const normalized = {
    ...query,
    methods: [...query.methods]
      .map(({ method, version }) => ({ method, version }))
      .sort((left, right) =>
        `${left.method}\u0000${left.version}`.localeCompare(
          `${right.method}\u0000${right.version}`,
        ),
      ),
    alleles: [...query.alleles].sort((left, right) => left.localeCompare(right)),
    peptideLengths: [...query.peptideLengths].sort((left, right) => left - right),
  };
  return computeProfileHash(normalized);
}

function verifyFixtureIds(fixtureCase: LoadedFixtureCase): void {
  const provenanceRecords = [
    ...fixtureCase.expectedCandidates.observations.map(({ provenance }) => provenance),
    fixtureCase.expectedCandidates.bcell.provenance,
    fixtureCase.expectedCandidates.coverage.provenance,
    fixtureCase.expectedCandidates.optimization.provenance,
    fixtureCase.expectedReport.provenance,
  ];
  if (provenanceRecords.some(({ fixtureId }) => fixtureId !== fixtureCase.fixtureId)) {
    throw new Error(`Fixture provenance ID mismatch for ${fixtureCase.fixtureId}`);
  }
}

export async function loadFixtureRegistry(
  directory = DEFAULT_FIXTURE_DIRECTORY,
): Promise<LoadedFixtureRegistry> {
  const manifestPath = join(directory, 'manifest.v1.json');
  const manifestDocument: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
  const manifest = fixtureManifestSchema.parse(manifestDocument);
  const cases = await Promise.all(
    manifest.entries.map(async (entry): Promise<LoadedFixtureCase> => {
      const [fasta, caseFile, candidatesFile, reportFile] = await Promise.all([
        loadFastaFile(directory, entry.files.inputFasta),
        loadJsonFile(directory, entry.files.case),
        loadJsonFile(directory, entry.files.expectedCandidates),
        loadJsonFile(directory, entry.files.expectedReport),
      ]);
      const caseDocument = fixtureCaseDocumentSchema.parse(caseFile.document);
      const expectedCandidates = expectedCandidatesSchema.parse(candidatesFile.document);
      const expectedReport = expectedFixtureReportSchema.parse(reportFile.document);
      const proteinSha256 = sha256Text(fasta.sequence);
      if (proteinSha256 !== caseDocument.proteinSha256) {
        throw new Error(`Protein SHA-256 mismatch for ${entry.fixtureId}`);
      }
      if (
        entry.fixtureId !== caseDocument.fixtureId ||
        entry.reviewStatus !== caseDocument.reviewStatus ||
        entry.scenarioName !== caseDocument.metadata.scenarioName
      ) {
        throw new Error(`Fixture manifest metadata mismatch for ${entry.fixtureId}`);
      }
      const contentHash = computeProfileHash({
        fasta: fasta.contents.replace(/\r\n/g, '\n'),
        case: caseFile.document,
        expectedCandidates: candidatesFile.document,
        expectedReport: reportFile.document,
      });
      if (contentHash !== entry.contentHash) {
        throw new Error(`Fixture content hash mismatch for ${entry.fixtureId}`);
      }
      const replayHash = computeProfileHash({
        selectors: caseDocument.selectors,
        expectedCandidates: candidatesFile.document,
        expectedReport: reportFile.document,
      });
      if (replayHash !== entry.replayHash) {
        throw new Error(`Fixture replay hash mismatch for ${entry.fixtureId}`);
      }
      const loaded = {
        ...caseDocument,
        fasta: { header: fasta.header, sequence: fasta.sequence },
        expectedCandidates,
        expectedReport,
        contentHash,
        replayHash,
      };
      verifyFixtureIds(loaded);
      return loaded;
    }),
  );
  const selectorOwners = new Map<string, string>();
  for (const fixtureCase of cases) {
    for (const selector of fixtureCase.selectors) {
      const key = selectorKey(selector);
      const owner = selectorOwners.get(key);
      if (owner !== undefined) {
        throw new Error(
          `Duplicate fixture selector shared by ${owner} and ${fixtureCase.fixtureId}`,
        );
      }
      selectorOwners.set(key, fixtureCase.fixtureId);
    }
  }
  return { manifest, manifestHash: computeProfileHash(manifestDocument), cases };
}

export function matchFixture(
  registry: LoadedFixtureRegistry,
  query: FixtureMatchQuery,
): LoadedFixtureCase | null {
  const parsed = fixtureMatchQuerySchema.parse(query);
  const key = selectorKey(parsed);
  return (
    registry.cases.find(
      (fixtureCase) =>
        fixtureCase.reviewStatus === 'APPROVED' &&
        fixtureCase.selectors.some((selector) => selectorKey(selector) === key),
    ) ?? null
  );
}

export function fixtureManifestSummary(registry: LoadedFixtureRegistry) {
  return {
    version: registry.manifest.version,
    sha256: registry.manifestHash,
    entries: registry.cases.map((fixtureCase) => ({
      fixtureId: fixtureCase.fixtureId,
      organism: fixtureCase.metadata.organismLabel,
      proteinName: fixtureCase.metadata.proteinName,
      reviewStatus: fixtureCase.reviewStatus,
      sourceKind: fixtureCase.sourceKind,
      scientificUse: fixtureCase.scientificUse,
      sha256: fixtureCase.contentHash,
    })),
  };
}
