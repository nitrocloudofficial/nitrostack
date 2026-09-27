/**
 * Thin HTTP client for the TASIE FastAPI backend.
 *
 * The MCP app is a stateless Node service; all detection / exploit / remediation
 * work lives in the Python backend. This client forwards tool calls over HTTP.
 *
 * Base URL comes from TASIE_API_BASE (set it in .env or the cloud env). If
 * unset, it falls back to DEFAULT_TASIE_API_BASE for local development.
 *
 * For a cloud deployment, point TASIE_API_BASE at a publicly reachable TASIE
 * host — NitroCloud deploys only this Node app; the Python engine + Docker
 * exploit sandbox must be hosted separately.
 */

const DEFAULT_TASIE_API_BASE = 'http://localhost:8000';

export interface TasieError {
  ok: false;
  status: number;
  error: string;
}

export interface TasieOk<T> {
  ok: true;
  data: T;
}

export type TasieResult<T> = TasieOk<T> | TasieError;

function baseUrl(): string {
  const raw = process.env.TASIE_API_BASE || DEFAULT_TASIE_API_BASE;
  return raw.replace(/\/+$/, '');
}

function authHeaders(): Record<string, string> {
  const key = process.env.TASIE_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
}

function timeoutMs(): number {
  const raw = Number(process.env.TASIE_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 120_000;
}

async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<TasieResult<T>> {
  const url = `${baseUrl()}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* leave as raw text */
    }
    if (!res.ok) {
      const detail =
        parsed && typeof parsed === 'object' && 'detail' in parsed
          ? String((parsed as Record<string, unknown>).detail)
          : String(parsed).slice(0, 400);
      return { ok: false, status: res.status, error: detail || res.statusText };
    }
    return { ok: true, data: parsed as T };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const hint =
      msg.includes('aborted') || msg.includes('abort')
        ? `request timed out after ${timeoutMs()}ms`
        : msg.includes('ECONNREFUSED') || msg.includes('fetch failed')
          ? `cannot reach TASIE backend at ${baseUrl()} — set TASIE_API_BASE`
          : msg;
    return { ok: false, status: 0, error: hint };
  } finally {
    clearTimeout(timer);
  }
}

export class TasieClient {
  static base(): string {
    return baseUrl();
  }

  static health(): Promise<TasieResult<{ status: string }>> {
    return request('GET', '/health');
  }

  static analyze(
    content: string,
    filename: string
  ): Promise<TasieResult<AnalyzeResponse>> {
    return request('POST', '/api/analyze', { content, filename });
  }

  static depScan(
    manifest: string,
    filename: string,
    online: boolean
  ): Promise<TasieResult<unknown>> {
    return request('POST', '/api/depscan', { manifest, filename, online });
  }

  static frameworks(source: string): Promise<TasieResult<unknown>> {
    return request('POST', '/api/frameworks', { source });
  }

  static remediate(file: string): Promise<TasieResult<unknown>> {
    return request('POST', '/api/remediate', { file });
  }

  static scanRepo(path: string): Promise<TasieResult<unknown>> {
    return request('POST', '/api/scan-repo', { path });
  }
}

/** Shape returned by POST /api/analyze (analyzer.analyze_buffer). */
export interface Finding {
  vuln_class: string;
  line?: number;
  message?: string;
  reason?: string;
  context?: string;
  route?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence?: string;
  owasp?: string | null;
  cwe?: string | null;
  [k: string]: unknown;
}

export interface AnalyzeSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface AnalyzeResponse {
  status: string;
  clean: boolean;
  ranked: Finding[];
  candidates: Finding[];
  summary: AnalyzeSummary;
  suppressed: Finding[];
  confirmed_targets: string[];
  error?: string;
}
