import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';

import { canonicalJsonSha256 } from '../../lib/algorithms/index.js';

import type { CapabilityPort } from './capability-port.js';
import { ToolExecutionError } from './executor.js';

const execFileAsync = promisify(execFile);
const METHOD = 'mhcflurry-presentation';
const METHOD_VERSION = '2.3.0';
const CONNECTOR_VERSION = 'local-cli-v1';
const DEFAULT_SOURCE_URI = 'https://openvax.github.io/mhcflurry/';

interface BindingInput {
  runId: string;
  proteinRef: string;
  sequence?: string;
  alleles: string[];
  peptideLengths: number[];
  methods: string[];
  fallbackPolicy: string;
}

export interface MhcflurryRunnerOptions {
  timeoutMs: number;
  maximumResponseBytes: number;
}

export type MhcflurryRunner = (
  args: readonly string[],
  options: MhcflurryRunnerOptions,
) => Promise<{ stdout: string; stderr: string }>;

export interface MhcflurryBindingCapabilityOptions {
  enabled: boolean;
  command?: string;
  runner?: MhcflurryRunner;
  timeoutMs?: number;
  maximumResponseBytes?: number;
  sourceUri?: string;
  methodVersion?: string;
}

export class MhcflurryBindingCapabilityPort implements CapabilityPort {
  private readonly runner: MhcflurryRunner;
  private readonly timeoutMs: number;
  private readonly maximumResponseBytes: number;
  private readonly command: string;
  private readonly sourceUri: string;
  private readonly methodVersion: string;

  constructor(private readonly options: MhcflurryBindingCapabilityOptions) {
    this.command = options.command ?? 'mhcflurry';
    this.runner =
      options.runner ?? ((args, runnerOptions) => runCommand(this.command, args, runnerOptions));
    this.timeoutMs = options.timeoutMs ?? 120_000;
    this.maximumResponseBytes = options.maximumResponseBytes ?? 10 * 1024 * 1024;
    this.sourceUri = options.sourceUri ?? DEFAULT_SOURCE_URI;
    this.methodVersion = options.methodVersion ?? METHOD_VERSION;
  }

  get liveEnabled(): boolean {
    return this.options.enabled;
  }

  async invoke(capability: string, input: unknown): Promise<unknown> {
    if (capability !== 'predict_mhci') {
      throw new ToolExecutionError(
        'MHCFLURRY_CAPABILITY_UNSUPPORTED',
        'CONNECTOR',
        `MHCflurry implements MHC-I prediction only, not ${capability}.`,
      );
    }
    if (!this.options.enabled) {
      throw new ToolExecutionError(
        'MHCFLURRY_NOT_CONFIGURED',
        'CONNECTOR',
        'The MHCflurry local predictor is disabled.',
        true,
      );
    }
    return this.predict(input as BindingInput);
  }

  private async predict(input: BindingInput) {
    if (input.sequence === undefined || input.sequence.length === 0) {
      throw new ToolExecutionError(
        'MHCFLURRY_SEQUENCE_REQUIRED',
        'VALIDATION',
        'A validated protein sequence is required for local MHCflurry prediction.',
      );
    }
    const sequenceHash = createHash('sha256').update(input.sequence).digest('hex');
    if (sequenceHash !== input.proteinRef) {
      throw new ToolExecutionError(
        'MHCFLURRY_SEQUENCE_HASH_MISMATCH',
        'VALIDATION',
        'The local prediction sequence does not match the protein reference hash.',
      );
    }
    if (input.methods.some((method) => method.toLowerCase() !== METHOD)) {
      throw new ToolExecutionError(
        'MHCFLURRY_METHOD_UNSUPPORTED',
        'VALIDATION',
        'MHCflurry MVP support is limited to mhcflurry-presentation.',
      );
    }
    const args = [
      ...this.commandPrefixArgs(),
      '--sequences',
      input.sequence,
      '--alleles',
      ...input.alleles,
      '--peptide-lengths',
      input.peptideLengths.join(','),
      '--results-all',
      '--output-delimiter',
      ',',
    ];
    const { stdout } = await this.run(args);
    const rows = parseCsv(stdout);
    const observations = rows.map((row) => this.mapRow(row, input));
    if (observations.length === 0) {
      throw new ToolExecutionError(
        'MHCFLURRY_RESPONSE_EMPTY',
        'CONNECTOR',
        'MHCflurry returned no prediction observations.',
        true,
      );
    }
    return {
      observations,
      provenance: [
        {
          connectorId: 'mhcflurry',
          connectorVersion: CONNECTOR_VERSION,
          method: METHOD,
          methodVersion: this.methodVersion,
          status: 'LIVE',
          sourceUri: this.sourceUri,
          parameters: {
            candidateType: 'MHCI',
            alleles: input.alleles,
            peptideLengths: input.peptideLengths,
            command: this.command,
          },
          predictionSource: 'LIVE',
          scientificUse: true,
          validationStatus: 'SCIENTIFIC',
        },
      ],
    };
  }

  private commandPrefixArgs(): string[] {
    return this.command.toLowerCase().includes('predict-scan') ? [] : ['predict-scan'];
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
        timedOut ? 'MHCFLURRY_TIMEOUT' : 'MHCFLURRY_EXECUTION_FAILED',
        timedOut ? 'TIMEOUT' : 'CONNECTOR',
        timedOut ? 'MHCflurry prediction timed out.' : 'MHCflurry prediction failed.',
        true,
      );
    }
    if (Buffer.byteLength(result.stdout, 'utf8') > this.maximumResponseBytes) {
      throw new ToolExecutionError(
        'MHCFLURRY_RESPONSE_TOO_LARGE',
        'CONNECTOR',
        'MHCflurry response exceeded the configured size limit.',
      );
    }
    return result;
  }

  private mapRow(row: Record<string, string>, input: BindingInput) {
    const peptide = requiredField(row, 'peptide');
    const start = startCoordinate(row);
    const end = start + peptide.length - 1;
    const allele = requiredAllele(row, input.alleles);
    const rawScore = numberField(row, ['mhcflurry_presentation_score', 'presentation_score']);
    const affinityNm = optionalNumberField(row, ['mhcflurry_affinity', 'affinity']);
    const affinityPercentile = optionalNumberField(row, [
      'mhcflurry_affinity_percentile',
      'affinity_percentile',
    ]);
    const processingScore = optionalNumberField(row, [
      'mhcflurry_processing_score',
      'processing_score',
    ]);
    const observationIdentity = {
      proteinHash: input.proteinRef,
      candidateType: 'MHCI',
      start,
      end,
      peptide,
      allele,
      method: METHOD,
      methodVersion: this.methodVersion,
    };
    return {
      observationId: canonicalJsonSha256(observationIdentity),
      candidateRef: canonicalJsonSha256({
        proteinHash: input.proteinRef,
        candidateType: 'MHCI',
        start,
        end,
        peptide,
        allele,
      }),
      candidateType: 'MHCI',
      peptide,
      start,
      end,
      length: peptide.length,
      allele,
      method: METHOD,
      methodVersion: this.methodVersion,
      rawScore,
      rawFields: {
        ...(affinityNm === undefined ? {} : { affinityNm }),
        ...(affinityPercentile === undefined ? {} : { affinityPercentile }),
        ...(processingScore === undefined ? {} : { processingScore }),
        ...(row.best_allele === undefined ? {} : { bestAllele: row.best_allele }),
        sourceRowHash: canonicalJsonSha256(row),
      },
    };
  }
}

async function runCommand(
  command: string,
  args: readonly string[],
  options: MhcflurryRunnerOptions,
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync(command, [...args], {
    timeout: options.timeoutMs,
    maxBuffer: options.maximumResponseBytes,
    windowsHide: true,
  });
  return { stdout: String(result.stdout), stderr: String(result.stderr) };
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) invalidResponse();
  const headerIndex = lines.findIndex((line) =>
    isPredictionHeader(parseCsvLine(line).map(normalizeHeader)),
  );
  if (headerIndex < 0 || headerIndex === lines.length - 1) invalidResponse();
  const headers = parseCsvLine(lines[headerIndex]!).map(normalizeHeader);
  const dataLines = lines.slice(headerIndex + 1);
  if (dataLines.length === 0) invalidResponse();
  return dataLines.map((line) => {
    const values = parseCsvLine(line);
    if (values.length !== headers.length) invalidResponse();
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function isPredictionHeader(headers: readonly string[]): boolean {
  for (const required of ['peptide']) {
    if (!headers.includes(required)) return false;
  }
  if (!headers.some((header) => ['pos', 'start'].includes(header))) return false;
  if (
    !headers.some((header) =>
      ['mhcflurry_presentation_score', 'presentation_score'].includes(header),
    )
  ) {
    return false;
  }
  return true;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (character === ',' && !quoted) {
      values.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  values.push(current);
  return values.map((value) => value.trim());
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[ .-]+/gu, '_');
}

function requiredField(row: Record<string, string>, field: string): string {
  const value = row[field]?.trim();
  if (value === undefined || value.length === 0) invalidResponse();
  return value;
}

function requiredAllele(row: Record<string, string>, inputAlleles: readonly string[]): string {
  const rowAllele = row.best_allele?.trim() || row.allele?.trim() || row.sample_name?.trim();
  if (rowAllele !== undefined && rowAllele.length > 0) return rowAllele;
  if (inputAlleles.length === 1) return inputAlleles[0]!;
  invalidResponse();
}

function startCoordinate(row: Record<string, string>): number {
  const start = optionalIntegerField(row, 'start');
  if (start !== undefined) return start;
  const zeroBased = optionalIntegerField(row, 'pos');
  if (zeroBased === undefined) invalidResponse();
  return zeroBased + 1;
}

function optionalIntegerField(row: Record<string, string>, field: string): number | undefined {
  const value = row[field]?.trim();
  if (value === undefined || value.length === 0) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) invalidResponse();
  return parsed;
}

function numberField(row: Record<string, string>, fields: string[]): number {
  const value = optionalNumberField(row, fields);
  if (value === undefined) invalidResponse();
  return value;
}

function optionalNumberField(row: Record<string, string>, fields: string[]): number | undefined {
  const field = fields.find((candidate) => row[candidate]?.trim().length);
  if (field === undefined) return undefined;
  const value = Number(row[field]);
  if (!Number.isFinite(value) || value < 0) invalidResponse();
  return value;
}

function invalidResponse(): never {
  throw new ToolExecutionError(
    'MHCFLURRY_RESPONSE_INVALID',
    'CONNECTOR',
    'MHCflurry returned an invalid prediction response.',
    false,
  );
}
