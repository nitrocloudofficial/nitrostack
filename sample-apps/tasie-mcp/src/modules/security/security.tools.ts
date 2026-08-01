import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import {
  TasieClient,
  type AnalyzeResponse,
  type Finding,
} from '../../tasie/tasie.client.js';

/**
 * TASIE security tools.
 *
 * Each tool is a thin proxy over the TASIE FastAPI backend (TASIE_API_BASE).
 * Stateless tools (scan_code, scan_dependencies, detect_frameworks) send the
 * code/manifest inline and work against any TASIE instance. The backend-state
 * tools (remediate_file, scan_repo) act on files that already live on the TASIE
 * host and require the full Docker-enabled deployment.
 */
export class SecurityTools {
  @Tool({
    name: 'scan_code',
    description:
      'Statically scan a source file for security vulnerabilities using TASIE. ' +
      'Returns ranked findings (SQLi, command injection, SSTI, XSS, path traversal, ' +
      'deserialization, and ~90 more classes) with severity, CWE and OWASP tags. ' +
      'Send the code inline — no files need to exist on the server.',
    inputSchema: z.object({
      content: z.string().describe('Full source code to scan'),
      filename: z
        .string()
        .default('app.py')
        .describe('Filename (drives language/framework detection, e.g. app.py)'),
    }),
    examples: {
      request: {
        filename: 'app.py',
        content:
          'import sqlite3\n@app.route("/u")\ndef u():\n    q = "SELECT * FROM users WHERE id=" + request.args["id"]\n    return db.execute(q)',
      },
      response: {
        clean: false,
        summary: { critical: 1, high: 0, medium: 0, low: 0, total: 1 },
        confirmed_targets: ['sql_injection'],
      },
    },
  })
  @Widget('scan-report')
  async scanCode(input: { content: string; filename?: string }, ctx: ExecutionContext) {
    const filename = input.filename || 'app.py';
    ctx.logger.info('scan_code', { filename, bytes: input.content?.length ?? 0 });

    const res = await TasieClient.analyze(input.content, filename);
    if (!res.ok) {
      ctx.logger.error('scan_code failed', { status: res.status, error: res.error });
      return { ok: false, filename, error: res.error, backend: TasieClient.base() };
    }

    const data = res.data as AnalyzeResponse;
    const findings = (data.ranked || data.candidates || []).map(shapeFinding);
    // `incomplete` = the source failed to parse (e.g. newlines were stripped and
    // the code is not valid Python); `error` = the analyzer itself failed. In
    // both cases there is nothing to report but it is NOT a clean result.
    const unparsed = data.status === 'incomplete' || data.status === 'error';
    const headline = unparsed
      ? `Could not scan ${filename}: source did not parse (status=${data.status}). ` +
        `Send the complete, valid source — check that newlines were preserved.`
      : data.clean
        ? `No vulnerabilities found in ${filename}`
        : `${data.summary?.total ?? findings.length} finding(s) in ${filename}: ` +
          (data.confirmed_targets || []).join(', ');
    return {
      ok: true,
      filename,
      clean: unparsed ? false : data.clean,
      parsed: !unparsed,
      status: data.status,
      summary: data.summary,
      confirmed_targets: data.confirmed_targets || [],
      findings,
      suppressed_count: (data.suppressed || []).length,
      headline,
    };
  }

  @Tool({
    name: 'scan_dependencies',
    description:
      'Software Composition Analysis: scan a Python dependency manifest ' +
      '(requirements.txt / Pipfile / pyproject) for known-vulnerable packages. ' +
      'Send the manifest text inline.',
    inputSchema: z.object({
      manifest: z.string().describe('Dependency manifest contents'),
      filename: z
        .string()
        .default('requirements.txt')
        .describe('Manifest filename (e.g. requirements.txt)'),
      online: z
        .boolean()
        .default(false)
        .describe('If true, query live advisory sources; else use the local DB'),
    }),
  })
  async scanDependencies(
    input: { manifest: string; filename?: string; online?: boolean },
    ctx: ExecutionContext
  ) {
    const filename = input.filename || 'requirements.txt';
    ctx.logger.info('scan_dependencies', { filename, online: !!input.online });
    const res = await TasieClient.depScan(input.manifest, filename, !!input.online);
    if (!res.ok) {
      return { ok: false, filename, error: res.error, backend: TasieClient.base() };
    }
    return { ok: true, filename, result: res.data };
  }

  @Tool({
    name: 'detect_frameworks',
    description:
      'Fingerprint the web framework(s) in a source file (Flask, FastAPI, ' +
      'Django, …) and report where the request-handling attack surface is. ' +
      'Send the code inline.',
    inputSchema: z.object({
      source: z.string().describe('Source code to fingerprint'),
    }),
  })
  async detectFrameworks(input: { source: string }, ctx: ExecutionContext) {
    ctx.logger.info('detect_frameworks', { bytes: input.source?.length ?? 0 });
    const res = await TasieClient.frameworks(input.source);
    if (!res.ok) return { ok: false, error: res.error, backend: TasieClient.base() };
    return { ok: true, result: res.data };
  }

  @Tool({
    name: 'remediate_file',
    description:
      'Full verified remediation loop on a file already loaded on the TASIE host: ' +
      'detect -> live-exploit in a sandbox -> assemble patch -> re-verify. ' +
      'Requires the full Docker-enabled TASIE deployment (TASIE_API_BASE). ' +
      'Returns the proof and the proposed patch for human review.',
    inputSchema: z.object({
      file: z
        .string()
        .default('app.py')
        .describe('Filename on the TASIE host to remediate'),
    }),
  })
  async remediateFile(input: { file?: string }, ctx: ExecutionContext) {
    const file = input.file || 'app.py';
    ctx.logger.info('remediate_file', { file });
    const res = await TasieClient.remediate(file);
    if (!res.ok) {
      return {
        ok: false,
        file,
        error: res.error,
        backend: TasieClient.base(),
        hint:
          res.status === 409
            ? 'sandbox not running on the TASIE host — this tool needs the full Docker deployment'
            : undefined,
      };
    }
    return { ok: true, file, result: res.data };
  }

  @Tool({
    name: 'scan_repo',
    description:
      'Ingest a multi-file repository on the TASIE host: discover routes and ' +
      'scan every module for vulnerabilities. Requires the path to exist on the ' +
      'TASIE backend (full deployment).',
    inputSchema: z.object({
      path: z.string().describe('Directory path on the TASIE host to scan'),
    }),
  })
  async scanRepo(input: { path: string }, ctx: ExecutionContext) {
    ctx.logger.info('scan_repo', { path: input.path });
    const res = await TasieClient.scanRepo(input.path);
    if (!res.ok) {
      return { ok: false, path: input.path, error: res.error, backend: TasieClient.base() };
    }
    return { ok: true, path: input.path, result: res.data };
  }

  @Tool({
    name: 'tasie_health',
    description:
      'Check that the TASIE backend is reachable and report which endpoint the ' +
      'MCP app is wired to.',
    inputSchema: z.object({}),
  })
  async health(_input: unknown, ctx: ExecutionContext) {
    const res = await TasieClient.health();
    ctx.logger.info('tasie_health', { ok: res.ok, backend: TasieClient.base() });
    if (!res.ok) {
      return { ok: false, backend: TasieClient.base(), error: res.error };
    }
    return { ok: true, backend: TasieClient.base(), status: res.data };
  }
}

function shapeFinding(f: Finding) {
  const asStr = (v: unknown) => (typeof v === 'string' ? v : null);
  return {
    vuln_class: f.vuln_class,
    line: f.line ?? null,
    severity: f.severity,
    confidence: f.confidence ?? null,
    cwe: f.cwe ?? null,
    owasp: f.owasp ?? null,
    route: asStr(f.route),
    // TASIE findings carry `reason` (and sometimes `context`); `message` may be absent.
    message: f.message ?? asStr(f.reason) ?? asStr(f.context),
  };
}
