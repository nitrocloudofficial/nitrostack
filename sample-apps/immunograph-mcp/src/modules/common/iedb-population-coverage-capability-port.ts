import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { CapabilityPort } from './capability-port.js';
import { ToolExecutionError } from './executor.js';

const execFileAsync = promisify(execFile);

interface PopulationCoverageInput {
  runId: string;
  associations: Array<{ candidateId: string; peptide?: string; allele: string }>;
  populationIds: string[];
  classMode: 'CLASS_I' | 'CLASS_II' | 'COMBINED';
  fallbackPolicy: string;
}

export interface IedbPopulationCoverageRunnerOptions {
  timeoutMs: number;
  maximumResponseBytes: number;
}

export type IedbPopulationCoverageRunner = (
  args: readonly string[],
  options: IedbPopulationCoverageRunnerOptions,
) => Promise<{ stdout: string; stderr: string }>;

export interface IedbPopulationCoverageCapabilityOptions {
  enabled: boolean;
  url?: string;
  request?: typeof fetch;
  scriptPath?: string;
  pythonCommand?: string;
  runner?: IedbPopulationCoverageRunner;
  timeoutMs?: number;
  maximumResponseBytes?: number;
  sourceUri?: string;
}

interface ProviderCoverageJson {
  projectedCoverage?: unknown;
  coverage?: unknown;
  averageHits?: unknown;
  average_hits?: unknown;
  pc90?: unknown;
  pc90Coverage?: unknown;
  pc90_coverage?: unknown;
  metrics?: unknown;
}

const CONNECTOR_ID = 'iedb-population-coverage';
const HTTP_CONNECTOR_VERSION = 'configurable-http-v1';
const CLI_CONNECTOR_VERSION = 'local-standalone-cli-v1';
const METHOD = 'iedb-population-coverage';
const METHOD_VERSION = 'v1';
const DEFAULT_SOURCE_URI = 'https://tools.iedb.org/population/download/';

export class IedbPopulationCoverageCapabilityPort implements CapabilityPort {
  private readonly request: typeof fetch;
  private readonly runner: IedbPopulationCoverageRunner;
  private readonly timeoutMs: number;
  private readonly maximumResponseBytes: number;
  private readonly pythonCommand: string;
  private readonly sourceUri: string;

  constructor(private readonly options: IedbPopulationCoverageCapabilityOptions) {
    this.request = options.request ?? fetch;
    this.pythonCommand = options.pythonCommand ?? 'python';
    this.runner =
      options.runner ??
      ((args, runnerOptions) => runCommand(this.pythonCommand, args, runnerOptions));
    this.timeoutMs = options.timeoutMs ?? 120_000;
    this.maximumResponseBytes = options.maximumResponseBytes ?? 10 * 1024 * 1024;
    this.sourceUri = options.sourceUri ?? DEFAULT_SOURCE_URI;
  }

  get liveEnabled(): boolean {
    return (
      this.options.enabled &&
      (this.options.url !== undefined || this.options.scriptPath !== undefined)
    );
  }

  async invoke(capability: string, input: unknown): Promise<unknown> {
    if (capability !== 'calculate_population_coverage') {
      throw new ToolExecutionError(
        'IEDB_POPULATION_COVERAGE_CAPABILITY_UNSUPPORTED',
        'CONNECTOR',
        `IEDB population coverage does not implement ${capability}.`,
      );
    }
    if (!this.options.enabled) {
      throw new ToolExecutionError(
        'IEDB_POPULATION_COVERAGE_NOT_CONFIGURED',
        'CONNECTOR',
        'The IEDB population coverage connector is disabled.',
        true,
      );
    }
    if (this.options.url === undefined && this.options.scriptPath === undefined) {
      throw new ToolExecutionError(
        'IEDB_POPULATION_COVERAGE_RUNTIME_REQUIRED',
        'CONNECTOR',
        'IEDB population coverage requires an explicit HTTP endpoint URL or standalone script path.',
        true,
      );
    }
    if (this.options.url !== undefined) {
      return this.calculateHttp(input as PopulationCoverageInput, this.options.url);
    }
    return this.calculateStandalone(input as PopulationCoverageInput, this.options.scriptPath);
  }

  private async calculateHttp(input: PopulationCoverageInput, endpoint: string) {
    if (input.associations.length === 0 || input.populationIds.length === 0) {
      throw new ToolExecutionError(
        'IEDB_POPULATION_COVERAGE_INPUT_EMPTY',
        'VALIDATION',
        'At least one HLA association and target population is required.',
      );
    }
    const body = {
      runId: input.runId,
      alleles: [...new Set(input.associations.map(({ allele }) => allele))].sort(),
      associations: input.associations,
      populationIds: input.populationIds,
      classMode: input.classMode,
    };
    const responseText = await this.post(endpoint, JSON.stringify(body));
    const parsed = parseProviderJson(responseText);
    return {
      projectedCoverage: parsed.projectedCoverage,
      metrics: {
        averageHits: parsed.averageHits,
        pc90: parsed.pc90,
        providerMetrics: parsed.providerMetrics,
      },
      provenance: {
        connectorId: CONNECTOR_ID,
        connectorVersion: HTTP_CONNECTOR_VERSION,
        method: METHOD,
        methodVersion: METHOD_VERSION,
        status: 'LIVE' as const,
        sourceUri: endpoint,
        parameters: {
          classMode: input.classMode,
          populationIds: input.populationIds,
          associationCount: input.associations.length,
        },
        predictionSource: 'LIVE' as const,
        scientificUse: true,
        validationStatus: 'SCIENTIFIC' as const,
      },
    };
  }

  private async calculateStandalone(
    input: PopulationCoverageInput,
    scriptPath: string | undefined,
  ) {
    if (scriptPath === undefined) {
      throw new ToolExecutionError(
        'IEDB_POPULATION_COVERAGE_RUNTIME_REQUIRED',
        'CONNECTOR',
        'IEDB population coverage requires an explicit HTTP endpoint URL or standalone script path.',
        true,
      );
    }
    if (input.associations.length === 0 || input.populationIds.length === 0) {
      throw new ToolExecutionError(
        'IEDB_POPULATION_COVERAGE_INPUT_EMPTY',
        'VALIDATION',
        'At least one HLA association and target population is required.',
      );
    }
    if (input.associations.some((association) => !association.peptide?.trim())) {
      throw new ToolExecutionError(
        'IEDB_POPULATION_COVERAGE_PEPTIDE_REQUIRED',
        'VALIDATION',
        'The IEDB standalone population coverage tool requires peptide text for each HLA association.',
      );
    }
    const tempDirectory = await mkdtemp(join(tmpdir(), 'immunograph-iedb-population-'));
    const inputFile = join(tempDirectory, 'associations.tsv');
    try {
      await writeFile(inputFile, formatStandaloneInput(input.associations), 'utf8');
      const args = [
        scriptPath,
        '-p',
        input.populationIds.join(','),
        '-c',
        classModeArgument(input.classMode),
        '-f',
        inputFile,
      ];
      const { stdout } = await this.run(args);
      const parsed = parseStandaloneOutput(stdout);
      return {
        projectedCoverage: parsed.projectedCoverage,
        metrics: {
          averageHits: parsed.averageHits,
          pc90: parsed.pc90,
          populations: parsed.populations,
        },
        provenance: {
          connectorId: CONNECTOR_ID,
          connectorVersion: CLI_CONNECTOR_VERSION,
          method: METHOD,
          methodVersion: METHOD_VERSION,
          status: 'LIVE' as const,
          sourceUri: this.sourceUri,
          parameters: {
            classMode: input.classMode,
            populationIds: input.populationIds,
            associationCount: input.associations.length,
            runtime: 'IEDB population coverage standalone Python tool',
          },
          predictionSource: 'LIVE' as const,
          scientificUse: true,
          validationStatus: 'SCIENTIFIC' as const,
        },
      };
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  }

  private async run(args: readonly string[]) {
    let result: { stdout: string; stderr: string };
    try {
      result = await this.runner(args, {
        timeoutMs: this.timeoutMs,
        maximumResponseBytes: this.maximumResponseBytes,
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError';
      throw new ToolExecutionError(
        timedOut ? 'IEDB_POPULATION_COVERAGE_TIMEOUT' : 'IEDB_POPULATION_COVERAGE_EXECUTION_FAILED',
        timedOut ? 'TIMEOUT' : 'CONNECTOR',
        timedOut
          ? 'IEDB population coverage timed out.'
          : 'IEDB population coverage standalone tool failed.',
        true,
      );
    }
    if (Buffer.byteLength(result.stdout, 'utf8') > this.maximumResponseBytes) responseTooLarge();
    return result;
  }

  private async post(endpoint: string, body: string): Promise<string> {
    let response: Response;
    try {
      response = await this.request(endpoint, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'user-agent': 'ImmunoGraph/0.1 (+https://tools.iedb.org/)',
        },
        body,
        redirect: 'error',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      throw new ToolExecutionError(
        timedOut ? 'IEDB_POPULATION_COVERAGE_TIMEOUT' : 'IEDB_POPULATION_COVERAGE_NETWORK_ERROR',
        timedOut ? 'TIMEOUT' : 'CONNECTOR',
        timedOut
          ? 'IEDB population coverage request timed out.'
          : 'IEDB population coverage request failed.',
        true,
      );
    }
    if (response.status === 429) {
      throw new ToolExecutionError(
        'IEDB_POPULATION_COVERAGE_RATE_LIMITED',
        'RATE_LIMIT',
        'IEDB rate-limited the population coverage request.',
        true,
      );
    }
    if (!response.ok) {
      throw new ToolExecutionError(
        'IEDB_POPULATION_COVERAGE_HTTP_ERROR',
        'CONNECTOR',
        `IEDB population coverage request failed with HTTP ${response.status}.`,
        response.status >= 500,
        { statusCode: response.status },
      );
    }
    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > this.maximumResponseBytes) responseTooLarge();
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > this.maximumResponseBytes) responseTooLarge();
    return text;
  }
}

async function runCommand(
  command: string,
  args: readonly string[],
  options: IedbPopulationCoverageRunnerOptions,
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync(command, [...args], {
    timeout: options.timeoutMs,
    maxBuffer: options.maximumResponseBytes,
    windowsHide: true,
  });
  return { stdout: String(result.stdout), stderr: String(result.stderr) };
}

function parseProviderJson(text: string): {
  projectedCoverage: number;
  averageHits: number | undefined;
  pc90: number | undefined;
  providerMetrics: unknown;
} {
  let value: ProviderCoverageJson;
  try {
    value = JSON.parse(text) as ProviderCoverageJson;
  } catch {
    invalidResponse();
  }
  const projectedCoverage = unit(value.projectedCoverage ?? value.coverage);
  return {
    projectedCoverage,
    averageHits: optionalNonnegative(value.averageHits ?? value.average_hits),
    pc90: optionalNonnegative(value.pc90 ?? value.pc90Coverage ?? value.pc90_coverage),
    providerMetrics: value.metrics,
  };
}

function parseStandaloneOutput(text: string): {
  projectedCoverage: number;
  averageHits: number | undefined;
  pc90: number | undefined;
  populations: Array<{
    populationId: string;
    projectedCoverage: number;
    averageHits: number;
    pc90: number;
  }>;
} {
  const lines = text
    .replace(/^\uFEFF/u, '')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const headerIndex = lines.findIndex((line) => {
    const normalized = line.toLowerCase().replace(/\s+/gu, '\t');
    return normalized === 'population/area\tcoverage\taverage_hit\tpc90';
  });
  if (headerIndex < 0) invalidResponse();
  const populations: Array<{
    populationId: string;
    projectedCoverage: number;
    averageHits: number;
    pc90: number;
  }> = [];
  let averageRow:
    | { projectedCoverage: number; averageHits: number | undefined; pc90: number | undefined }
    | undefined;
  for (const line of lines.slice(headerIndex + 1)) {
    if (line.toLowerCase().startsWith('population/area')) break;
    if (line.toLowerCase().startsWith('class ')) break;
    const columns = line.split('\t').map((value) => value.trim());
    if (columns.length < 4) continue;
    const populationId = columns[0]!;
    const projectedCoverage = coverageColumn(columns[1]);
    const averageHits = optionalNonnegative(columns[2]);
    const pc90 = optionalNonnegative(columns[3]);
    if (averageHits === undefined || pc90 === undefined) invalidResponse();
    if (populationId.toLowerCase() === 'average') {
      averageRow = { projectedCoverage, averageHits, pc90 };
      continue;
    }
    if (populationId.toLowerCase() === 'standard_deviation') continue;
    populations.push({ populationId, projectedCoverage, averageHits, pc90 });
  }
  if (populations.length === 0 && averageRow === undefined) invalidResponse();
  const projectedCoverage =
    averageRow?.projectedCoverage ??
    average(populations.map((population) => population.projectedCoverage));
  return {
    projectedCoverage,
    averageHits:
      averageRow?.averageHits ?? average(populations.map((population) => population.averageHits)),
    pc90: averageRow?.pc90 ?? average(populations.map((population) => population.pc90)),
    populations,
  };
}

function formatStandaloneInput(
  associations: ReadonlyArray<{ peptide?: string; allele: string }>,
): string {
  const byPeptide = new Map<string, Set<string>>();
  for (const association of associations) {
    const peptide = association.peptide?.trim();
    const allele = association.allele.trim();
    if (peptide === undefined || peptide.length === 0 || allele.length === 0) invalidResponse();
    const existing = byPeptide.get(peptide) ?? new Set<string>();
    existing.add(allele);
    byPeptide.set(peptide, existing);
  }
  return [...byPeptide.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([peptide, alleles]) => `${peptide}\t${[...alleles].sort().join(',')}`)
    .join('\n');
}

function classModeArgument(classMode: PopulationCoverageInput['classMode']): string {
  if (classMode === 'CLASS_I') return 'I';
  if (classMode === 'CLASS_II') return 'II';
  return 'combined';
}

function coverageColumn(value: unknown): number {
  if (typeof value === 'string' && value.trim().endsWith('%')) {
    return roundUnit(Number(value.trim().slice(0, -1)) / 100);
  }
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 1 && parsed <= 100) return roundUnit(parsed / 100);
  return roundUnit(unit(value));
}

function average(values: readonly number[]): number {
  if (values.length === 0) invalidResponse();
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(12));
}

function roundUnit(value: number): number {
  return Number(unit(value).toFixed(12));
}

function unit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) invalidResponse();
  return parsed;
}

function optionalNonnegative(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) invalidResponse();
  return parsed;
}

function responseTooLarge(): never {
  throw new ToolExecutionError(
    'IEDB_POPULATION_COVERAGE_RESPONSE_TOO_LARGE',
    'CONNECTOR',
    'IEDB population coverage response exceeded the configured size limit.',
  );
}

function invalidResponse(): never {
  throw new ToolExecutionError(
    'IEDB_POPULATION_COVERAGE_RESPONSE_INVALID',
    'CONNECTOR',
    'IEDB population coverage returned an invalid response.',
    false,
  );
}
