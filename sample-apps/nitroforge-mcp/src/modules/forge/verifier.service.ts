import { Injectable } from '@nitrostack/core';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { EndpointGraph } from '../../contracts/endpoint-graph.schema.js';
import type { ToolSurfaceIR } from '../../contracts/ir.schema.js';
import type { GeneratedProject } from '../../contracts/generated-project.schema.js';
import { VerificationReportSchema, type VerificationReport, type StageResult } from '../../contracts/verification-report.schema.js';
type ToolResult = VerificationReport['toolResults'][number];
import type { EmitPort } from '../../contracts/ports.js';
import { resolvePrimaryEndpoint } from './schema-derivation.js';
import { synthesizeResponseExample } from './example-synthesis.js';

/**
 * verifier.service.ts -- (4) VERIFY: a real machine oracle, never a model
 * reviewing generated code. Four stages: typecheck, build, boot+handshake,
 * replay (each tool's examples.request against a MOCKED HTTP layer, diffed
 * against examples.response).
 *
 * INTERFACE NOTE: EmitPort.verify(project) is frozen and can't take ir/graph
 * -- but real replay needs both (to build the mock-fetch route table and to
 * know each tool's primaryEndpoint). Rather than parse ir/graph back out of
 * generated source text (fragile, and not what those files are for), this
 * class implements `verify(project)` to satisfy the frozen interface
 * (stages 1+2 only -- typecheck+build, no replay, since it genuinely can't
 * do more with only a GeneratedProject) and ADDS `verifyWithContext(project,
 * ir, graph)` -- not part of any frozen contract, purely additive -- which
 * forge.tools.ts actually calls, since it already has both ids in scope.
 *
 * BUILD STAGE: uses plain `tsc` (emitting to dist/), not `nitrostack-cli
 * build`. Deliberate: `nitrostack-cli init` was confirmed interactive +
 * network-dependent (PostHog) in this sandbox during Phase 1B; `tsc` gives
 * an equivalent "compiles for real" guarantee without that risk. Worth
 * trying `nitrostack-cli build` on a real dev machine instead.
 *
 * WIDGETS_DEV_MODE=true is set on every spawned boot -- confirmed in
 * node_modules/@nitrostack/core/dist/ui-next/index.js that this is required
 * for ANY @Widget()-decorated tool to boot without a pre-built static
 * export, and templates/widget-archetypes/ is still empty.
 */
@Injectable()
export class VerifierService implements Pick<EmitPort, 'verify'> {
  async verify(project: GeneratedProject): Promise<VerificationReport> {
    const typecheck = await this.runTypecheck(project.rootPath);
    const build = typecheck.passed ? await this.runBuild(project.rootPath) : this.skipped();
    return VerificationReportSchema.parse({
      status: typecheck.passed && build.passed ? 'green' : 'red',
      stages: { typecheck, build, boot: this.skipped(), replay: this.skipped() },
      toolResults: project.toolNames.map((tool) => ({ tool, passed: false, diff: 'not run -- verify(project) has no ir/graph context, see verifyWithContext' })),
      repairAttempts: 0,
    });
  }

  async verifyWithContext(project: GeneratedProject, ir: ToolSurfaceIR, graph: EndpointGraph): Promise<VerificationReport> {
    const typecheck = await this.runTypecheck(project.rootPath);
    if (!typecheck.passed) {
      return this.finalize(typecheck, this.skipped(), this.skipped(), this.skipped(), project.toolNames, 0);
    }

    const build = await this.runBuild(project.rootPath);
    if (!build.passed) {
      return this.finalize(typecheck, build, this.skipped(), this.skipped(), project.toolNames, 0);
    }

    const mockRoutesPath = await this.writeMockFetch(project.rootPath, ir, graph);
    const bootStart = Date.now();
    let child;
    try {
      child = await this.bootServer(project.rootPath, mockRoutesPath);
    } catch (err) {
      const boot: StageResult = { passed: false, durationMs: Date.now() - bootStart };
      return this.finalize(typecheck, build, boot, this.skipped(), project.toolNames, 0, err instanceof Error ? err.message : String(err));
    }
    const boot: StageResult = { passed: true, durationMs: Date.now() - bootStart };

    const replayStart = Date.now();
    const toolResults = await this.replayTools(child, ir, graph);
    child.proc.kill();
    // kill() only sends the signal -- it doesn't wait for the OS to actually
    // tear the process down. On Windows a caller that immediately rmSync's
    // project.rootPath (as forge.tools.test.ts's cleanup does) can race a
    // not-yet-released file handle and fail with EPERM. Wait for the real
    // exit (bounded, in case 'exit' never fires) before returning.
    await this.waitForExit(child.proc);
    const replay: StageResult = { passed: toolResults.every((r) => r.passed), durationMs: Date.now() - replayStart };

    return this.finalize(typecheck, build, boot, replay, project.toolNames, 0, undefined, toolResults);
  }

  private waitForExit(proc: ReturnType<typeof spawn>): Promise<void> {
    return new Promise((resolve) => {
      if (proc.exitCode !== null || proc.signalCode !== null) {
        resolve();
        return;
      }
      const done = () => resolve();
      proc.once('exit', done);
      // Safety net -- don't hang verification forever if 'exit' never fires.
      setTimeout(done, 3000);
    });
  }

  private finalize(
    typecheck: StageResult,
    build: StageResult,
    boot: StageResult,
    replay: StageResult,
    toolNames: string[],
    repairAttempts: number,
    bootError?: string,
    toolResults?: ToolResult[],
  ): VerificationReport {
    const results = toolResults ?? toolNames.map((tool) => ({ tool, passed: false, diff: bootError ?? 'not reached' }));
    const status = typecheck.passed && build.passed && boot.passed && replay.passed ? 'green' : 'red';
    return VerificationReportSchema.parse({
      status,
      stages: { typecheck, build, boot, replay },
      toolResults: results,
      repairAttempts,
    });
  }

  private skipped(): StageResult {
    return { passed: false, durationMs: 0 };
  }

  private runCmd(cmd: string, args: string[], cwd: string, timeoutMs: number): Promise<StageResult> {
    const start = Date.now();
    return new Promise((resolve) => {
      // shell:true is required on Windows -- `npx` (and most npm-installed
      // CLIs) resolve to a `.cmd` shim, not a real executable, so
      // child_process.spawn without a shell fails near-instantly with a
      // spawn error (ENOENT-style) rather than actually running the
      // command. Verified: without this, typecheck/build "failed" in ~10ms
      // every time -- too fast to be a real tsc invocation.
      const proc = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
      let output = '';
      proc.stdout?.on('data', (d: Buffer) => (output += d.toString()));
      proc.stderr?.on('data', (d: Buffer) => (output += d.toString()));
      const timer = setTimeout(() => {
        proc.kill();
        resolve({ passed: false, durationMs: Date.now() - start, log: `timed out after ${timeoutMs}ms` });
      }, timeoutMs);
      proc.on('exit', (code) => {
        clearTimeout(timer);
        resolve({ passed: code === 0, durationMs: Date.now() - start, log: code === 0 ? undefined : output.trim() || `exit code ${code}` });
      });
      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({ passed: false, durationMs: Date.now() - start, log: err.message });
      });
    });
  }

  private runTypecheck(rootPath: string): Promise<StageResult> {
    return this.runCmd('npx', ['tsc', '--noEmit'], rootPath, 45000);
  }
  private runBuild(rootPath: string): Promise<StageResult> {
    return this.runCmd('npx', ['tsc', '-p', 'tsconfig.json'], rootPath, 45000);
  }

  /** Build a route table (method + path-regex -> canned response) and a fetch-overriding preload module, written into the project dir. Not part of GeneratedProject.files -- verification tooling, not shipped output. */
  private async writeMockFetch(rootPath: string, ir: ToolSurfaceIR, graph: EndpointGraph): Promise<string> {
    const routes: Array<{ method: string; pathPattern: string; response: unknown }> = [];
    for (const mod of ir.modules) {
      for (const tool of mod.tools) {
        const endpoint = resolvePrimaryEndpoint(graph, tool.primaryEndpoint);
        const pathPattern = endpoint.path.replace(/\{(\w+)\}/g, '[^/]+');
        const response = tool.examples?.response ?? synthesizeResponseExample(endpoint.responseSchema);
        routes.push({ method: endpoint.method.toUpperCase(), pathPattern, response });
      }
    }
    await writeFile(join(rootPath, '__verify-routes.json'), JSON.stringify(routes, null, 2), 'utf-8');
    const preload = `import { readFileSync } from 'node:fs';\nimport { fileURLToPath } from 'node:url';\nimport { dirname, join } from 'node:path';\nconst __dirname = dirname(fileURLToPath(import.meta.url));\nconst routes = JSON.parse(readFileSync(join(__dirname, '__verify-routes.json'), 'utf-8'));\nglobalThis.fetch = async (url, init) => {\n  const u = new URL(String(url));\n  const method = (init && init.method ? init.method : 'GET').toUpperCase();\n  for (const r of routes) {\n    if (r.method !== method) continue;\n    if (new RegExp('^' + r.pathPattern + '$').test(u.pathname)) {\n      return new Response(JSON.stringify(r.response), { status: 200, headers: { 'Content-Type': 'application/json' } });\n    }\n  }\n  return new Response(JSON.stringify({ error: 'no mock route for ' + method + ' ' + u.pathname }), { status: 404 });\n};\n`;
    const preloadPath = join(rootPath, '__verify-mock-fetch.mjs');
    await writeFile(preloadPath, preload, 'utf-8');
    return preloadPath;
  }

  private bootServer(rootPath: string, preloadPath: string): Promise<{ proc: ReturnType<typeof spawn>; send: (msg: unknown) => void; waitFor: (id: number, timeoutMs?: number) => Promise<any> }> {
    return new Promise((resolve, reject) => {
      // node --import requires a file:// URL on Windows -- a raw absolute
      // path (e.g. "C:\...") throws ERR_UNSUPPORTED_ESM_URL_SCHEME and the
      // child exits immediately. That looked like a silent 15s "boot
      // timeout" from the caller's side (no stderr was ever read here),
      // when the real failure was an instant crash. Verified directly:
      // same spawn args reproduced the exact error in isolation.
      const preloadUrl = pathToFileURL(preloadPath).href;
      const proc = spawn('node', ['--import', preloadUrl, 'dist/index.js'], {
        cwd: rootPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      let buf = '';
      const responses: any[] = [];
      proc.stdout.on('data', (d) => {
        buf += d.toString();
        let idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.trim()) {
            try {
              responses.push(JSON.parse(line));
            } catch {
              /* framework log line, not JSON-RPC */
            }
          }
        }
      });

      // Surfaced on failure below -- this was previously discarded entirely,
      // which is why the --import file:// bug above looked like an
      // unexplained timeout instead of the instant crash it actually was.
      let stderrLog = '';
      proc.stderr.on('data', (d) => (stderrLog += d.toString()));

      let settled = false;
      proc.on('exit', (code, signal) => {
        if (settled || code === 0 || code === null) return;
        // Crashed before responding to initialize -- fail fast instead of
        // waiting out the full boot timeout for a process that's already gone.
        settled = true;
        clearTimeout(bootTimeout);
        reject(new Error(`server exited with code ${code} (signal ${signal}) before responding to initialize:\n${stderrLog.trim()}`));
      });

      const send = (msg: unknown) => proc.stdin.write(JSON.stringify(msg) + '\n');
      const waitFor = (id: number, timeoutMs = 15000) => {
        const start = Date.now();
        return new Promise<any>((res, rej) => {
          const iv = setInterval(() => {
            const found = responses.find((r) => r.id === id);
            if (found) {
              clearInterval(iv);
              res(found);
            } else if (Date.now() - start > timeoutMs) {
              clearInterval(iv);
              rej(new Error(`timeout waiting for response id ${id}`));
            }
          }, 50);
        });
      };

      const bootTimeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        proc.kill();
        reject(new Error(`boot timeout -- server never responded to initialize:\n${stderrLog.trim()}`));
      }, 15000);

      send({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'nitroforge-verifier', version: '0.1.0' } } });
      waitFor(0)
        .then(() => {
          if (settled) return;
          settled = true;
          clearTimeout(bootTimeout);
          send({ jsonrpc: '2.0', method: 'notifications/initialized' });
          resolve({ proc, send, waitFor });
        })
        .catch((err) => {
          if (settled) return;
          settled = true;
          clearTimeout(bootTimeout);
          reject(err);
        });
    });
  }

  private async replayTools(
    child: { send: (msg: unknown) => void; waitFor: (id: number, timeoutMs?: number) => Promise<any> },
    ir: ToolSurfaceIR,
    graph: EndpointGraph,
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    let reqId = 1000;
    for (const mod of ir.modules) {
      for (const tool of mod.tools) {
        const id = reqId++;
        const endpoint = resolvePrimaryEndpoint(graph, tool.primaryEndpoint);
        const expected = tool.examples?.response ?? synthesizeResponseExample(endpoint.responseSchema);
        const request = tool.examples?.request ?? {};
        try {
          child.send({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: tool.name, arguments: request } });
          const res = await child.waitFor(id, 10000);
          if (res.result?.isError) {
            results.push({ tool: tool.name, passed: false, diff: JSON.stringify(res.result) });
            continue;
          }
          const text = res.result?.content?.[0]?.text;
          const actual = text ? JSON.parse(text) : res.result;
          const passed = JSON.stringify(actual) === JSON.stringify(expected);
          results.push({ tool: tool.name, passed, diff: passed ? null : JSON.stringify({ expected, actual }) });
        } catch (err) {
          results.push({ tool: tool.name, passed: false, diff: err instanceof Error ? err.message : String(err) });
        }
      }
    }
    return results;
  }
}
