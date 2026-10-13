import { createHash } from 'node:crypto';

import { canonicalJsonSha256 } from '../../lib/algorithms/index.js';

import type { CapabilityPort } from './capability-port.js';
import { ToolExecutionError } from './executor.js';

type BindingTrack = 'MHCI' | 'MHCII';

interface BindingInput {
  runId: string;
  proteinRef: string;
  sequence?: string;
  alleles: string[];
  peptideLengths: number[];
  methods: string[];
  fallbackPolicy: string;
}

interface MethodRegistration {
  providerMethod: string;
  methodVersion: string;
}

export interface IedbBindingCapabilityOptions {
  enabled: boolean;
  request?: typeof fetch;
  timeoutMs?: number;
  mhciUrl?: string;
  mhciiUrl?: string;
  maximumResponseBytes?: number;
}

const DEFAULT_MHCI_URL = 'https://tools-cluster-interface.iedb.org/tools_api/mhci/';
const DEFAULT_MHCII_URL = 'https://tools-cluster-interface.iedb.org/tools_api/mhcii/';

const METHOD_REGISTRY: Record<BindingTrack, Record<string, MethodRegistration>> = {
  MHCI: {
    'iedb-recommended': { providerMethod: 'recommended', methodVersion: '2023.09' },
  },
  MHCII: {
    'iedb-recommended': { providerMethod: 'recommended', methodVersion: '2023.09' },
    'iedb-mhcii': { providerMethod: 'recommended', methodVersion: '2023.09' },
  },
};

export class IedbBindingCapabilityPort implements CapabilityPort {
  private readonly request: typeof fetch;
  private readonly timeoutMs: number;
  private readonly mhciUrl: string;
  private readonly mhciiUrl: string;
  private readonly maximumResponseBytes: number;

  constructor(private readonly options: IedbBindingCapabilityOptions) {
    this.request = options.request ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 120_000;
    this.mhciUrl = options.mhciUrl ?? DEFAULT_MHCI_URL;
    this.mhciiUrl = options.mhciiUrl ?? DEFAULT_MHCII_URL;
    this.maximumResponseBytes = options.maximumResponseBytes ?? 10 * 1024 * 1024;
  }

  /** True when the IEDB live connector is enabled in the current environment. */
  get liveEnabled(): boolean {
    return this.options.enabled;
  }

  async invoke(capability: string, input: unknown): Promise<unknown> {
    if (capability !== 'predict_mhci' && capability !== 'predict_mhcii') {
      throw new ToolExecutionError(
        'IEDB_CAPABILITY_UNSUPPORTED',
        'CONNECTOR',
        `IEDB binding does not implement ${capability}.`,
      );
    }
    if (!this.options.enabled) {
      throw new ToolExecutionError(
        'IEDB_NOT_CONFIGURED',
        'CONNECTOR',
        'The IEDB live binding connector is disabled.',
        true,
      );
    }
    const track: BindingTrack = capability === 'predict_mhci' ? 'MHCI' : 'MHCII';
    return this.predict(input as BindingInput, track);
  }

  private async predict(input: BindingInput, track: BindingTrack) {
    if (input.sequence === undefined || input.sequence.length === 0) {
      throw new ToolExecutionError(
        'IEDB_SEQUENCE_REQUIRED',
        'VALIDATION',
        'A validated protein sequence is required for live IEDB prediction.',
      );
    }
    const sequenceHash = createHash('sha256').update(input.sequence).digest('hex');
    if (sequenceHash !== input.proteinRef) {
      throw new ToolExecutionError(
        'IEDB_SEQUENCE_HASH_MISMATCH',
        'VALIDATION',
        'The live prediction sequence does not match the protein reference hash.',
      );
    }

    const observations: Array<Record<string, unknown>> = [];
    const provenance: Array<Record<string, unknown>> = [];
    for (const requestedMethod of input.methods) {
      const registration = METHOD_REGISTRY[track][requestedMethod.toLowerCase()];
      if (registration === undefined) {
        throw new ToolExecutionError(
          'IEDB_METHOD_UNSUPPORTED',
          'VALIDATION',
          `${requestedMethod} is not registered for ${track}.`,
        );
      }
      const body = new URLSearchParams({
        method: registration.providerMethod,
        sequence_text: input.sequence,
        allele: input.alleles.join(','),
        length: input.peptideLengths.join(','),
      });
      const endpoint = track === 'MHCI' ? this.mhciUrl : this.mhciiUrl;
      const responseText = await this.post(endpoint, body);
      const rows = parseIedbTsv(responseText);
      for (const row of rows) {
        const start = integerField(row, 'start');
        const end = integerField(row, 'end');
        const length = integerField(row, 'length');
        const peptide = requiredField(row, 'peptide');
        const allele = requiredField(row, 'allele');
        const rawScore = numberField(row, ['score', 'ic50', 'adjusted_score']);
        const percentileRank = optionalNumberField(row, [
          'percentile_rank',
          'percentile',
          'rank',
          'adjusted_rank',
        ]);
        const observationIdentity = {
          proteinHash: input.proteinRef,
          candidateType: track,
          start,
          end,
          peptide,
          allele,
          method: requestedMethod,
          methodVersion: registration.methodVersion,
        };
        const observationId = canonicalJsonSha256(observationIdentity);
        observations.push({
          observationId,
          candidateRef: canonicalJsonSha256({
            proteinHash: input.proteinRef,
            candidateType: track,
            start,
            end,
            peptide,
            allele,
          }),
          candidateType: track,
          peptide,
          start,
          end,
          length,
          method: requestedMethod,
          methodVersion: registration.methodVersion,
          rawScore,
          ...(percentileRank === undefined ? {} : { percentileRank }),
          allele,
          rawFields: sanitizeProviderRow(row),
        });
      }
      provenance.push({
        connectorId: 'iedb',
        connectorVersion: 'tools-api-v1',
        method: requestedMethod,
        methodVersion: registration.methodVersion,
        status: 'LIVE',
        sourceUri: endpoint,
        parameters: {
          providerMethod: registration.providerMethod,
          candidateType: track,
          alleles: input.alleles,
          peptideLengths: input.peptideLengths,
        },
        predictionSource: 'LIVE',
        scientificUse: true,
        validationStatus: 'SCIENTIFIC',
      });
    }
    if (observations.length === 0) {
      throw new ToolExecutionError(
        'IEDB_RESPONSE_EMPTY',
        'CONNECTOR',
        'IEDB returned no prediction observations.',
        true,
      );
    }
    return { observations, provenance };
  }

  private async post(endpoint: string, body: URLSearchParams): Promise<string> {
    let response: Response;
    try {
      response = await this.request(endpoint, {
        method: 'POST',
        headers: {
          accept: 'text/tsv, text/tab-separated-values, text/plain',
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': 'ImmunoGraph/0.1 (+https://tools.iedb.org/main/tools-api/)',
        },
        body,
        redirect: 'error',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      throw new ToolExecutionError(
        timedOut ? 'IEDB_TIMEOUT' : 'IEDB_NETWORK_ERROR',
        timedOut ? 'TIMEOUT' : 'CONNECTOR',
        timedOut ? 'IEDB binding request timed out.' : 'IEDB binding request failed.',
        true,
      );
    }
    if (response.status === 429) {
      throw new ToolExecutionError(
        'IEDB_RATE_LIMITED',
        'RATE_LIMIT',
        'IEDB rate-limited the binding request.',
        true,
      );
    }
    if (!response.ok) {
      throw new ToolExecutionError(
        'IEDB_HTTP_ERROR',
        'CONNECTOR',
        `IEDB binding request failed with HTTP ${response.status}.`,
        response.status >= 500,
        { statusCode: response.status },
      );
    }
    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > this.maximumResponseBytes) {
      throw new ToolExecutionError(
        'IEDB_RESPONSE_TOO_LARGE',
        'CONNECTOR',
        'IEDB response exceeded the configured size limit.',
      );
    }
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > this.maximumResponseBytes) {
      throw new ToolExecutionError(
        'IEDB_RESPONSE_TOO_LARGE',
        'CONNECTOR',
        'IEDB response exceeded the configured size limit.',
      );
    }
    return text;
  }
}

function parseIedbTsv(text: string): Array<Record<string, string>> {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) invalidResponse();
  const headers = lines[0]!.split('\t').map(normalizeHeader);
  for (const required of ['allele', 'start', 'end', 'length', 'peptide']) {
    if (!headers.includes(required)) invalidResponse();
  }
  if (!headers.some((header) => ['score', 'ic50', 'adjusted_score'].includes(header))) {
    invalidResponse();
  }
  return lines.slice(1).map((line) => {
    const values = line.split('\t');
    if (values.length !== headers.length) invalidResponse();
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
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

function integerField(row: Record<string, string>, field: string): number {
  const value = Number(requiredField(row, field));
  if (!Number.isInteger(value) || value <= 0) invalidResponse();
  return value;
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

function sanitizeProviderRow(row: Record<string, string>): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      const numeric = Number(value);
      return [key, value.trim().length > 0 && Number.isFinite(numeric) ? numeric : value];
    }),
  );
}

function invalidResponse(): never {
  throw new ToolExecutionError(
    'IEDB_RESPONSE_INVALID',
    'CONNECTOR',
    'IEDB returned an invalid binding response.',
    false,
  );
}
