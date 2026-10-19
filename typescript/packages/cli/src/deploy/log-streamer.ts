import chalk from 'chalk';
import { StudioApiClient, StudioApiError } from '../api/client.js';

export interface LogBatchResponse {
  lines?: string[];
  logs?: string;
  buildLog?: string;
  deploymentLog?: string;
  nextOffset?: number;
  offset?: number;
  eof?: boolean;
}

export type LogStreamType = 'build' | 'runtime' | 'all';

export interface DeploymentLogStreamerOptions {
  client: StudioApiClient;
  deploymentId: string;
  type?: LogStreamType;
  limit?: number;
}

/**
 * Applies terminal color coding to log prefixes for enhanced legibility.
 */
export function colorizeLogLine(line: string): string {
  if (!line) return '';

  return line
    .replace(/^(\s*\[builder\])/i, chalk.cyan.bold('$1'))
    .replace(/^(\s*\[docker\])/i, chalk.blue.bold('$1'))
    .replace(/^(\s*\[runtime\])/i, chalk.green.bold('$1'))
    .replace(/^(\s*\[system\])/i, chalk.magenta.bold('$1'))
    .replace(/(\b(ERROR|Error|error|FAILED|Failed|failed)\b)/g, chalk.red.bold('$1'))
    .replace(/(\b(WARN|Warn|warning|WARNING)\b)/g, chalk.yellow.bold('$1'))
    .replace(/(\b(SUCCESS|Ready|READY|success)\b)/g, chalk.green.bold('$1'));
}

export const PLACEHOLDER_LOG_MESSAGES = new Set([
  'build not started yet',
  'no logs available',
  'no build logs available',
  'no logs available for this deployment yet.',
  "we're still fetching logs. this can take a moment — check back shortly.",
]);

export function isPlaceholderLog(text: string): boolean {
  if (!text) return true;
  const trimmed = text.trim().toLowerCase();
  return (
    PLACEHOLDER_LOG_MESSAGES.has(trimmed) ||
    trimmed.startsWith('no logs available') ||
    trimmed.startsWith('no build logs available')
  );
}

/**
 * Handles incremental polling and streaming of build/runtime logs from NitroCloud.
 */
export class DeploymentLogStreamer {
  private readonly client: StudioApiClient;
  private readonly deploymentId: string;
  private readonly type: LogStreamType;
  private readonly limit: number;

  private currentOffset = 0;
  private isTerminated = false;
  private allAccumulatedLines: string[] = [];

  constructor(optionsOrClient: DeploymentLogStreamerOptions | StudioApiClient, deploymentId?: string, type?: LogStreamType) {
    if (typeof deploymentId === 'string') {
      this.client = optionsOrClient as StudioApiClient;
      this.deploymentId = deploymentId;
      this.type = type || 'build';
      this.limit = 200;
    } else {
      const opts = optionsOrClient as DeploymentLogStreamerOptions;
      this.client = opts.client;
      this.deploymentId = opts.deploymentId;
      this.type = opts.type || 'build';
      this.limit = opts.limit || 200;
    }
  }

  public get offset(): number {
    return this.currentOffset;
  }

  public get eof(): boolean {
    return this.isTerminated;
  }

  /**
   * Fetches the next incremental slice of logs from NitroCloud.
   */
  public async fetchNextChunk(): Promise<string[]> {
    if (this.isTerminated) {
      return [];
    }

    let endpoint = `/deployments/${this.deploymentId}/logs/build?offset=${this.currentOffset}&limit=${this.limit}`;
    if (this.type === 'runtime') {
      endpoint = `/deployments/${this.deploymentId}/logs/deployment?offset=${this.currentOffset}&limit=${this.limit}`;
    } else if (this.type === 'all') {
      endpoint = `/deployments/${this.deploymentId}/logs?offset=${this.currentOffset}&limit=${this.limit}`;
    }

    let response: LogBatchResponse;
    try {
      response = await this.client.request<LogBatchResponse>(endpoint);
    } catch (err) {
      // Handle fallback to /studio/deployments/:id/logs if deployments route is unavailable
      if (err instanceof StudioApiError && (err.statusCode === 404 || err.statusCode === 400)) {
        try {
          response = await this.client.request<LogBatchResponse>(
            `/studio/deployments/${this.deploymentId}/logs?offset=${this.currentOffset}&limit=${this.limit}`,
          );
        } catch {
          return [];
        }
      } else {
        return [];
      }
    }

    // Scenario 1: Backend provides pre-sliced lines array
    if (Array.isArray(response.lines)) {
      const filteredLines = response.lines.filter((line) => !isPlaceholderLog(line));
      this.currentOffset = response.nextOffset ?? (this.currentOffset + response.lines.length);
      if (response.eof) {
        this.isTerminated = true;
      }
      this.allAccumulatedLines.push(...filteredLines);
      return filteredLines;
    }

    // Scenario 2: Backend returns text buffer (logs, buildLog, or deploymentLog)
    let rawText = '';
    if (this.type === 'runtime') {
      rawText = response.deploymentLog || response.logs || '';
    } else if (this.type === 'all') {
      rawText = [response.buildLog, response.deploymentLog, response.logs]
        .filter(Boolean)
        .join('\n');
    } else {
      rawText = response.buildLog || response.logs || '';
    }

    if (!rawText || isPlaceholderLog(rawText)) {
      return [];
    }

    const fullLines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    this.allAccumulatedLines = fullLines;

    if (fullLines.length > this.currentOffset) {
      const newLines = fullLines.slice(this.currentOffset);
      this.currentOffset = fullLines.length;
      return newLines;
    }

    return [];
  }

  /**
   * Retrieves the tail N lines of accumulated or latest logs for error reporting.
   */
  public async fetchTail(linesCount: number = 20): Promise<string[]> {
    if (this.allAccumulatedLines.length === 0) {
      await this.fetchNextChunk();
    }
    return this.allAccumulatedLines.slice(-linesCount);
  }
}
