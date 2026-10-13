/**
 * End-to-end verification.
 *
 * Spawns the real MCP server over STDIO — exactly the way NitroStudio does —
 * and drives the full demo path with real JSON-RPC. If this passes, the demo
 * works; it is not a unit test of internals but a rehearsal of the thing the
 * judges will watch.
 *
 *   npm run verify
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

interface RpcResponse {
  id?: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(label: string, condition: boolean, detail = ''): boolean {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${label}${detail ? `  \x1b[2m${detail}\x1b[0m` : ''}`);
  } else {
    failed++;
    failures.push(label);
    console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? `  \x1b[2m${detail}\x1b[0m` : ''}`);
  }
  return condition;
}

class McpClient {
  private child: ChildProcessWithoutNullStreams;
  private buffer = '';
  private nextId = 1;
  private pending = new Map<number, (value: RpcResponse) => void>();

  constructor(env: Record<string, string> = {}) {
    this.child = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        BRIDGE_TRANSPORT: 'stdio',
        LOG_LEVEL: 'error',
        ...env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.child.stdout.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString();
      let index: number;
      while ((index = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, index).trim();
        this.buffer = this.buffer.slice(index + 1);
        if (!line) continue;
        try {
          const message = JSON.parse(line) as RpcResponse;
          if (typeof message.id === 'number' && this.pending.has(message.id)) {
            this.pending.get(message.id)!(message);
            this.pending.delete(message.id);
          }
        } catch {
          // Non-JSON on stdout would be a protocol violation; surface it.
          console.log(`  \x1b[33m!\x1b[0m non-JSON on stdout: ${line.slice(0, 120)}`);
        }
      }
    });

    this.child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      if (/error|✗|failed/i.test(text) && !/LOG_LEVEL/.test(text)) {
        process.stderr.write(`  \x1b[2m[server] ${text.trim().slice(0, 300)}\x1b[0m\n`);
      }
    });
  }

  request(method: string, params: unknown = {}, timeoutMs = 45000): Promise<RpcResponse> {
    const id = this.nextId++;
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, (value) => {
        clearTimeout(timer);
        resolve(value);
      });
    });
  }

  notify(method: string, params: unknown = {}): void {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  }

  /**
   * Call a tool and return its structured payload. `meta` lands in the request's
   * `_meta`, which is where a stdio client presents its credential.
   */
  async callTool(
    name: string,
    args: Record<string, unknown> = {},
    meta?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const response = await this.request('tools/call', {
      name,
      arguments: meta ? { ...args, _meta: meta } : args,
    });
    if (response.error) throw new Error(`${name}: ${response.error.message}`);
    const result = response.result as
      | { structuredContent?: Record<string, unknown>; content?: { type: string; text?: string }[]; isError?: boolean }
      | undefined;
    if (result?.isError) {
      const text = result.content?.map((c) => c.text).join(' ') ?? 'unknown error';
      throw new Error(`${name} returned isError: ${text}`);
    }
    if (result?.structuredContent) return result.structuredContent;
    const text = result?.content?.find((c) => c.type === 'text')?.text;
    if (text) {
      try {
        return JSON.parse(text) as Record<string, unknown>;
      } catch {
        return { text };
      }
    }
    return {};
  }

  close(): void {
    this.child.kill('SIGTERM');
  }
}

const API_KEY = 'verify-admin-key';
const HTTP_PORT = 8991;

/**
 * The transport-security half of the rehearsal.
 *
 * Runs against its own server processes because the properties under test are
 * boot-time ones: whether BRIDGE_TRANSPORT actually selects HTTP, whether the
 * 50mb body limit reached the Express parser, and whether a configured
 * credential is enforced at both entrances (the HTTP edge and the per-tool
 * guard, which is the only one stdio ever meets).
 */
async function verifySecurity(): Promise<void> {
  /* ------------------- the per-tool guard, over stdio ------------------- */
  console.log('\n\x1b[1m13. Authorisation (stdio, via the tool guard)\x1b[0m');
  const guarded = new McpClient({ BRIDGE_ADMIN_API_KEY: API_KEY });
  try {
    await guarded.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'bridge-verify-auth', version: '1.0.0' },
    });
    guarded.notify('notifications/initialized');

    // Reads stay open — an agent that must authenticate to ask a question stops asking.
    let readable = false;
    try {
      await guarded.callTool('list_pipeline_nodes');
      readable = true;
    } catch {
      readable = false;
    }
    check('read-only tools remain open when auth is configured', readable);

    let blocked = false;
    try {
      await guarded.callTool('reset_bridge', { confirm: false });
    } catch (error) {
      blocked = /requires a credential/i.test(String(error));
    }
    check('a mutating tool is refused without a credential', blocked);

    let wrongKeyBlocked = false;
    try {
      await guarded.callTool('reset_bridge', { confirm: false }, { apiKey: 'not-the-key' });
    } catch (error) {
      wrongKeyBlocked = /not recognised/i.test(String(error));
    }
    check('a wrong credential is refused', wrongKeyBlocked);

    let allowed = false;
    try {
      const result = await guarded.callTool('reset_bridge', { confirm: false }, { apiKey: API_KEY });
      allowed = result.reset === false; // confirm:false, so it declines to wipe — but it ran
    } catch {
      allowed = false;
    }
    check('the correct credential is admitted', allowed);
  } finally {
    guarded.close();
  }

  /* ------------------- the HTTP edge and the payload limit ------------------- */
  console.log('\n\x1b[1m14. Remote surface (HTTP transport)\x1b[0m');
  const server = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      BRIDGE_TRANSPORT: 'http',
      PORT: String(HTTP_PORT),
      HOST: '127.0.0.1',
      BRIDGE_ADMIN_API_KEY: API_KEY,
      LOG_LEVEL: 'error',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let banner = '';
  server.stderr.on('data', (chunk: Buffer) => {
    banner += chunk.toString();
  });

  const endpoint = `http://127.0.0.1:${HTTP_PORT}/mcp`;
  const post = async (body: unknown, headers: Record<string, string> = {}) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...headers,
      },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      sessionId: response.headers.get('mcp-session-id'),
      text: await response.text(),
    };
  };

  try {
    // Wait for the listener rather than sleeping a fixed amount.
    const deadline = Date.now() + 90_000;
    let up = false;
    while (Date.now() < deadline && !up) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        const health = await fetch(`${endpoint}/health`);
        up = health.ok;
      } catch {
        up = false;
      }
    }
    if (!check('BRIDGE_TRANSPORT=http actually starts an HTTP listener', up, endpoint)) return;

    check(
      'the 50mb JSON body limit reached the Express parser',
      /JSON body limit 50mb \(via (express-patch|router-stack)\)/.test(banner),
      banner.split('\n').find((l) => l.includes('[bridge] Security:'))?.trim() ?? 'no security banner'
    );

    const call = (name: string, args: Record<string, unknown> = {}) => ({
      jsonrpc: '2.0',
      id: 99,
      method: 'tools/call',
      params: { name, arguments: args },
    });

    const anonymous = await post(call('resolve_conflict', { conflict_id: 'x', chosen: 'a' }));
    check('an unauthenticated mutation is refused at the HTTP edge', anonymous.status === 401,
      `HTTP ${anonymous.status}`);

    const wrongKey = await post(call('resolve_conflict', { conflict_id: 'x', chosen: 'a' }), {
      'x-api-key': 'not-the-key',
    });
    check('a wrong credential is refused at the HTTP edge', wrongKey.status === 403,
      `HTTP ${wrongKey.status}`);

    // A full session, to prove the credential also passes the tool guard behind it.
    const init = await post(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'bridge-verify-http', version: '1.0.0' },
        },
      },
      { 'x-api-key': API_KEY }
    );
    const session = init.sessionId ?? '';
    check('an authenticated session initializes', init.status === 200 && !!session);
    await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, {
      'x-api-key': API_KEY,
      'mcp-session-id': session,
    });

    // ~700 KB: comfortably past body-parser's 100kb default, so a pass here can
    // only mean the limit was raised.
    const large = 'Aurora architecture decision record paragraph. '.repeat(15_000);
    const bulk = await post(
      call('ingest_manual_document', { name: 'Bulk payload probe', text: large }),
      { 'x-api-key': API_KEY, 'mcp-session-id': session }
    );
    check(
      'a payload far past the 100kb default is accepted',
      bulk.status === 200 && bulk.text.includes('"ingested"'),
      `${Math.round(large.length / 1024)} KB → HTTP ${bulk.status}`
    );

    // The health endpoint stays open so a load balancer can reach it.
    const health = await fetch(`${endpoint}/health`);
    check('the health endpoint stays reachable without a credential', health.ok,
      `HTTP ${health.status}`);
  } catch (error) {
    check(`remote surface checks (${error instanceof Error ? error.message : String(error)})`, false);
  } finally {
    server.kill('SIGTERM');
  }
}

async function main() {
  console.log('\n\x1b[1mEnterprise Agentic Bridge — end-to-end verification\x1b[0m');
  console.log('\x1b[2mDriving the real MCP server over STDIO, the way NitroStudio does.\x1b[0m\n');

  // Start from a clean slate so the run is reproducible.
  const stateDir = path.join(ROOT, '.bridge');
  if (fs.existsSync(stateDir)) fs.rmSync(stateDir, { recursive: true, force: true });
  // The manifest is written beside the code it describes, so an unqualified
  // run lands it in the bundled fixture rather than in this project's root.
  const manifestPath = path.join(ROOT, 'fixtures', 'legacy-monolith', 'CLAUDE.md');
  // Note: this project's own CLAUDE.md is a checked-in artifact and is
  // deliberately NOT touched here — the bridge no longer writes to it.
  if (fs.existsSync(manifestPath)) fs.rmSync(manifestPath);
  const skillsDir = path.join(ROOT, 'src', 'skills');
  if (fs.existsSync(skillsDir)) fs.rmSync(skillsDir, { recursive: true, force: true });

  const client = new McpClient();

  try {
    /* ------------------------------ handshake ------------------------------ */
    console.log('\x1b[1m1. Protocol handshake\x1b[0m');
    const init = await client.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'bridge-verify', version: '1.0.0' },
    });
    const serverInfo = (init.result as { serverInfo?: { name: string; version: string } })?.serverInfo;
    check('server initializes', !!serverInfo, serverInfo ? `${serverInfo.name} v${serverInfo.version}` : '');
    client.notify('notifications/initialized');

    /* ----------------------------- discovery ----------------------------- */
    console.log('\n\x1b[1m2. Capability discovery\x1b[0m');
    const toolsResponse = await client.request('tools/list');
    const tools = ((toolsResponse.result as { tools?: { name: string }[] })?.tools ?? []).map((t) => t.name);
    check('tools registered', tools.length >= 18, `${tools.length} tools`);

    const expected = [
      'run_swarm', 'get_swarm_run', 'map_file_dependencies', 'find_change_surface',
      'parse_package_specs', 'extract_test_strategy', 'parse_ci_cd_pipelines', 'parse_design_system',
      'fetch_sprint_goals', 'fetch_meeting_transcripts', 'detect_conflicts', 'resolve_conflict',
      'list_conflicts', 'generate_custom_skill', 'list_generated_skills', 'save_pipeline',
      'run_pipeline', 'list_pipeline_nodes', 'get_pipeline', 'query_knowledge',
      'synthesize_claude_md', 'ingest_manual_document', 'reset_bridge',
    ];
    const missing = expected.filter((t) => !tools.includes(t));
    check('every expected tool present', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : '');

    const resourcesResponse = await client.request('resources/list');
    const resources = ((resourcesResponse.result as { resources?: { uri: string }[] })?.resources ?? []).length;
    check('resources registered', resources >= 5, `${resources} resources`);

    const promptsResponse = await client.request('prompts/list');
    const prompts = ((promptsResponse.result as { prompts?: { name: string }[] })?.prompts ?? []).length;
    check('prompts registered', prompts >= 3, `${prompts} prompts`);

    /* ------------------------ individual reconnaissance ------------------------ */
    /* --------------------- live data sources + remote repos --------------------- */
    // The two things that make this server deployable rather than demo-only:
    // it reads real enterprise systems, and it analyses a repo it does not have
    // on local disk. Both are checked before the fixture-backed sections so a
    // failure here is unambiguous.
    console.log('\n\x1b[1m2b. Live data sources\x1b[0m');

    const sprintProbe = await client.callTool('fetch_sprint_goals');
    const jiraConfigured = !!(process.env.JIRA_BASE_URL || process.env.JIRA_DOMAIN);
    check(
      'sprint state reports its provenance',
      sprintProbe.dataSource === 'jira-live' || sprintProbe.dataSource === 'fixture',
      String(sprintProbe.dataSource)
    );
    check(
      jiraConfigured
        ? 'live Jira credentials produce live sprint data'
        : 'unconfigured Jira falls back to the fixture and says how to fix it',
      jiraConfigured
        ? sprintProbe.dataSource === 'jira-live'
        : sprintProbe.dataSource === 'fixture' && /JIRA_/.test(String(sprintProbe.configurationHint)),
      jiraConfigured ? undefined : String(sprintProbe.configurationHint).slice(0, 70)
    );

    const chatProbe = await client.callTool('fetch_meeting_transcripts');
    const slackConfigured = !!process.env.SLACK_BOT_TOKEN;
    check(
      slackConfigured
        ? 'live Slack credentials produce live decisions'
        : 'unconfigured Slack falls back to the fixture and says how to fix it',
      slackConfigured
        ? chatProbe.dataSource === 'slack-live'
        : chatProbe.dataSource === 'fixture' && /SLACK_/.test(String(chatProbe.configurationHint)),
      slackConfigured ? undefined : String(chatProbe.configurationHint).slice(0, 70)
    );
    check(
      'decision classification survives the source swap',
      (chatProbe.bindingDirectives as unknown[])?.length > 0,
      `${(chatProbe.bindingDirectives as unknown[])?.length ?? 0} binding directive(s)`
    );

    console.log('\n\x1b[1m2c. Remote codebase ingestion\x1b[0m');

    const badHost = await client.callTool('map_file_dependencies', {
      target: 'https://gitlab.com/some/repo',
    }).catch((e: Error) => ({ error: e.message }));
    check(
      'a non-allow-listed git host is refused',
      /allow-list/i.test(JSON.stringify(badHost)),
      'host allow-list held'
    );

    if (process.env.BRIDGE_SKIP_NETWORK_CHECKS === 'true') {
      console.log('  \x1b[2m· remote clone check skipped (BRIDGE_SKIP_NETWORK_CHECKS=true)\x1b[0m');
    } else {
      try {
        const remote = await client.callTool('map_file_dependencies', {
          target: 'https://github.com/octocat/Hello-World',
        });
        check(
          'a GitHub URL is cloned and traversed',
          (remote.source as { kind?: string })?.kind === 'github',
          `${(remote.source as { repository?: string })?.repository}@${(remote.source as { commit?: string })?.commit?.slice(0, 8)}`
        );
        check(
          'the temp clone is reported by repo slug, not by temp path',
          !/tmp/i.test(String(remote.target)),
          String(remote.target)
        );
      } catch (error) {
        check('a GitHub URL is cloned and traversed', false, (error as Error).message.slice(0, 90));
      }
    }

    console.log('\n\x1b[1m3. Reconnaissance tools (bundled legacy fixture)\x1b[0m');

    const map = await client.callTool('map_file_dependencies');
    check('map_file_dependencies parses the repo', (map.fileCount as number) > 20, `${map.fileCount} files`);
    const hotspots = map.hotspots as { path: string; inbound: number }[];
    check(
      'the custom ORM is identified as the top hotspot',
      hotspots?.[0]?.path?.includes('aurora-orm'),
      hotspots?.[0] ? `${hotspots[0].path} ← ${hotspots[0].inbound}` : 'no hotspots'
    );

    const surface = await client.callTool('find_change_surface', { query: 'aurora-orm', max_depth: 3 });
    const impacted = surface.impacted as unknown[];
    check('find_change_surface walks dependents', impacted?.length > 0, `${impacted?.length ?? 0} impacted files`);

    const deps = await client.callTool('parse_package_specs');
    check(
      'parse_package_specs reads npm + maven + pypi',
      Object.keys(deps.byEcosystem as object).length >= 3,
      Object.entries(deps.byEcosystem as Record<string, number>).map(([k, v]) => `${k}:${v}`).join(' ')
    );
    check('aging dependencies flagged', (deps.agingSignals as unknown[]).length > 0,
      `${(deps.agingSignals as unknown[]).length} signals`);

    const qa = await client.callTool('extract_test_strategy');
    const thresholds = qa.coverageThresholds as Record<string, number>;
    check('coverage gate recovered from jest config', thresholds?.lines === 78, `lines ${thresholds?.lines}%`);
    check('spec naming convention inferred', String(qa.namingConvention).includes('.spec.js'), String(qa.namingConvention));
    check('written policies extracted from CONTRIBUTING', (qa.writtenPolicies as unknown[]).length > 0,
      `${(qa.writtenPolicies as unknown[]).length} policies`);

    const devops = await client.callTool('parse_ci_cd_pipelines');
    const pipelines = devops.pipelines as { system: string; stages: unknown[] }[];
    check('Jenkinsfile + GitHub Actions both parsed', pipelines.length >= 2,
      pipelines.map((p) => `${p.system}(${p.stages.length})`).join(' '));
    const convention = devops.commitConvention as { requiresTicketRef: boolean; scopes: string[] } | null;
    check('commit convention recovered', !!convention, convention ? `${convention.scopes.length} scopes` : 'none');
    check('mandatory ticket ref detected', convention?.requiresTicketRef === true);
    check('manual approval gate detected', (devops.manualApprovalGates as unknown[]).length > 0);

    const design = await client.callTool('parse_design_system');
    check('design tokens extracted', (design.tokens as unknown[]).length > 10, `${(design.tokens as unknown[]).length} tokens`);
    check('component inventory built', (design.components as unknown[]).length >= 3,
      (design.components as { name: string }[]).map((c) => c.name).join(', '));

    /* ------------------------------ the swarm ------------------------------ */
    console.log('\n\x1b[1m4. Swarm orchestration + conflict detection\x1b[0m');

    const swarm = await client.callTool('run_swarm', { synthesize: true });
    check('all seven personas completed', swarm.agentsCompleted === 7, `${swarm.agentsCompleted}/7`);
    check('no agent failed', swarm.agentsFailed === 0);
    check('knowledge base populated', (swarm.factsGathered as number) > 25, `${swarm.factsGathered} facts`);
    check(
      'the planted Redis/Memcached contradiction was caught',
      (swarm.openConflicts as number) === 1,
      `${swarm.openConflicts} open conflict(s)`
    );
    check(
      'run PAUSED instead of guessing',
      swarm.status === 'awaiting-resolution',
      String(swarm.status)
    );
    check('manifest correctly withheld while conflicted', !swarm.manifestPath);

    const conflicts = (swarm.conflicts as {
      id: string; kind: string; similarity: number; divergence: number; recommendation: string;
    }[]) ?? [];
    const conflict = conflicts[0];
    check('conflict classified as a contradiction', conflict?.kind === 'contradiction', conflict?.kind);
    check(
      'two-signal scoring beat naive cosine',
      conflict?.divergence >= 0.6,
      `alignment ${conflict?.similarity} · divergence ${conflict?.divergence}`
    );
    check('meeting recommended as authoritative', conflict?.recommendation === 'b');

    /* -------------------- synthesis is blocked while conflicted -------------------- */
    console.log('\n\x1b[1m5. Guard rails\x1b[0m');
    let blocked = false;
    try {
      await client.callTool('synthesize_claude_md');
    } catch (error) {
      blocked = /unresolved conflict/i.test(String(error));
    }
    check('synthesize refuses to run with an open conflict', blocked);

    /* ------------------------ human-in-the-loop resolution ------------------------ */
    console.log('\n\x1b[1m6. Human-in-the-loop resolution\x1b[0m');
    const resolved = await client.callTool('resolve_conflict', {
      conflict_id: conflict.id,
      chosen: 'b',
      resolved_by: 'verify-script',
    });
    check('conflict resolved', resolved.resolved === true);
    check('no conflicts left open', resolved.openCount === 0);
    check('paused swarm run resumed', !!resolved.resumedRun, String(resolved.resumedRun ?? ''));

    /* --------------------------- skill metaprogramming --------------------------- */
    console.log('\n\x1b[1m7. Dynamic skill generation\x1b[0m');
    const skill = await client.callTool('generate_custom_skill', {
      name: 'query_aurora_orm_usage',
      description: 'Finds every AuroraORM call site and reports which tables the codebase touches.',
      rationale: 'AuroraORM is a hand-rolled 2009 mapper with no modern equivalent.',
      params: [],
      body: `const hits = api.grep("Orm\\\\.q\\\\(");
const tables = {};
for (const hit of hits) {
  const match = hit.text.match(/Orm\\.q\\(\\s*['"]([A-Z_]+)['"]/);
  if (match) tables[match[1]] = (tables[match[1]] || 0) + 1;
}
return { callSites: hits.length, tables, files: [...new Set(hits.map(h => h.path))] };`,
    });
    check('skill minted', skill.generated === true);
    check('registered on the LIVE server', skill.registeredLive === true);
    check('reviewable source emitted', fs.existsSync(path.join(ROOT, String(skill.sourceFile))), String(skill.sourceFile));

    const toolsAfter = await client.request('tools/list');
    const namesAfter = ((toolsAfter.result as { tools?: { name: string }[] })?.tools ?? []).map((t) => t.name);
    check(
      'new tool appears in tools/list without a restart',
      namesAfter.includes('query_aurora_orm_usage'),
      `${namesAfter.length} tools now (was ${tools.length})`
    );

    const skillResult = await client.callTool('query_aurora_orm_usage');
    const inner = skillResult.result as { callSites: number; tables: Record<string, number> };
    check('the generated skill actually executes', inner?.callSites > 0,
      `${inner?.callSites} call sites, tables: ${Object.keys(inner?.tables ?? {}).join(', ')}`);

    // Deny-list must hold.
    let rejected = false;
    try {
      await client.callTool('generate_custom_skill', {
        name: 'malicious_probe',
        description: 'Should be rejected by the deny-list before compilation.',
        params: [],
        body: 'return require("fs").readFileSync("/etc/passwd", "utf8");',
      });
    } catch (error) {
      rejected = /require/i.test(String(error));
    }
    check('deny-list rejects module access in a skill body', rejected);

    /* -------------------------------- pipeline -------------------------------- */
    console.log('\n\x1b[1m8. Pipeline builder\x1b[0m');
    const catalog = await client.callTool('list_pipeline_nodes');
    check('all eleven stages in the catalog', catalog.nodeCount === 11, `${catalog.nodeCount} nodes`);

    const saved = await client.callTool('save_pipeline', {
      name: 'Aurora feature SDLC',
      description: 'Verification pipeline',
      nodes: [
        { id: 'n1', type: 'understand', requiresApproval: false, config: {} },
        { id: 'n2', type: 'explore', requiresApproval: false, config: {} },
        { id: 'n3', type: 'write_tests', requiresApproval: false, config: {} },
        { id: 'n4', type: 'push', requiresApproval: false, config: {} },
      ],
      edges: [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n3' },
        { from: 'n3', to: 'n4' },
      ],
    });
    check('pipeline saved and topologically sorted', saved.saved === true,
      (saved.executionOrder as string[]).join(' → '));

    // A cycle must be rejected, not silently executed.
    let cycleRejected = false;
    try {
      await client.callTool('save_pipeline', {
        name: 'cyclic',
        nodes: [
          { id: 'a', type: 'think', requiresApproval: false, config: {} },
          { id: 'b', type: 'design', requiresApproval: false, config: {} },
        ],
        edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }],
      });
    } catch (error) {
      cycleRejected = /cycle/i.test(String(error));
    }
    check('cyclic pipeline rejected', cycleRejected);

    const ran = await client.callTool('run_pipeline', {
      task: 'Add pagination to the customer tier listing',
      pipeline_name: 'Aurora feature SDLC',
    });
    check('pipeline executed', (ran.completed as number) === 4, `${ran.completed} stages`);
    check('side-effecting stages planned, not performed by default', (ran.planned as number) >= 1,
      `${ran.executed} executed / ${ran.planned} planned`);
    check('plan mode is reported as such', ran.sideEffectsMode === 'planned');

    /* --------------------- side effects, performed for real --------------------- */
    console.log('\n\x1b[1m8b. Side effects executed for real\x1b[0m');

    await client.callTool('save_pipeline', {
      name: 'Side-effect probe',
      description: 'Exercises the real execution path',
      nodes: [
        // A command with no dependencies, so the check measures the executor
        // rather than whether a fixture's devDependencies happen to be installed.
        { id: 's1', type: 'run_tests', requiresApproval: false, config: { test_command: 'node --version' } },
        { id: 's2', type: 'push', requiresApproval: false, config: {} },
        { id: 's3', type: 'send_slack_message', requiresApproval: false, config: {} },
      ],
      edges: [],
    });

    const realRun = await client.callTool('run_pipeline', {
      // Carries a ticket key, so the push stage clears the commit-convention gate
      // and is stopped by the branch-protection gate instead — which is the one
      // being verified here.
      task: 'Guard against null ISSUED_ON in the date window [AUR-4480]',
      pipeline_name: 'Side-effect probe',
      execute_side_effects: true,
    });
    check('execute mode is reported as such', realRun.sideEffectsMode === 'executed');

    const stages = realRun.results as { id: string; executed: boolean; output: string; status: string }[];
    const tests = stages.find((s) => s.id === 's1');
    check(
      'run_tests really ran the command',
      tests?.executed === true && /PASSED/.test(tests.output ?? ''),
      tests?.output?.split('\n').find((l) => l.startsWith('PASSED') || l.startsWith('FAILED')) ?? 'no result line'
    );
    check(
      'the command output was captured',
      /v\d+\.\d+\.\d+/.test(tests?.output ?? ''),
      'node --version echoed back'
    );

    const push = stages.find((s) => s.id === 's2');
    check(
      'push refuses a protected branch even in execute mode',
      push?.executed === false && /protected branch/i.test(push.output ?? ''),
      'branch protection held'
    );

    const slack = stages.find((s) => s.id === 's3');
    check(
      'unconfigured integrations name the variable that enables them',
      push !== undefined && /SLACK_WEBHOOK_URL/.test(slack?.output ?? '')
    );
    check(
      'configured integrations are reported',
      typeof (realRun.integrations as Record<string, boolean>)?.slack === 'boolean',
      Object.entries(realRun.integrations as Record<string, boolean>)
        .filter(([, on]) => on)
        .map(([name]) => name)
        .join(', ') || 'none wired in this environment'
    );

    /* ------------------------------- knowledge ------------------------------- */
    console.log('\n\x1b[1m9. Knowledge base + manifest\x1b[0m');
    const query = await client.callTool('query_knowledge', { query: 'how do I write a test here', limit: 5 });
    check('semantic search returns relevant facts', (query.resultCount as number) > 0,
      `${query.resultCount} of ${query.totalFacts} facts`);

    const ingest = await client.callTool('ingest_manual_document', {
      name: 'ADR-021 — event bus deferred',
      text:
        'Status: Accepted.\n\nThe team evaluated an internal event bus for invoice state changes.\n\n' +
        'It is deferred to Q1. Do not introduce a message broker into the billing monolith this quarter.',
    });
    check('manual document ingested and chunked', ingest.ingested === true, `${ingest.chunks} chunk(s)`);

    const manifest = await client.callTool('synthesize_claude_md');
    check('manifest written', manifest.written === true, `${manifest.lines} lines, ${manifest.bytes} bytes`);
    check('human ruling recorded in the manifest', manifest.resolvedConflicts === 1);
    check(
      'manifest landed in the analysed repo, not the bridge',
      manifest.destination === 'analyzed-repo' && fs.existsSync(manifestPath),
      String(manifest.absolutePath)
    );

    const content = fs.readFileSync(manifestPath, 'utf8');
    const sections: [string, string][] = [
      ['section 0 — authoritative human decisions', '## 0. Authoritative decisions'],
      ['section 1 — architectural topography', '## 1. Architectural topography'],
      ['section 2 — tailored skills', '## 2. Available tailored skills'],
      ['section 3 — current human alignment', '## 3. Current human alignment'],
      ['section 4 — cultural and syntactic rigor', '## 4. Cultural and syntactic rigor'],
      ['section 5 — design system adherence', '## 5. Design system adherence'],
    ];
    for (const [label, needle] of sections) {
      check(label, content.includes(needle));
    }

    check('the human ruling beat the Jira ticket', /NOT introducing Redis|Memcached/i.test(
      content.split('## 1.')[0]
    ));
    check('generated skill documented in the manifest', content.includes('query_aurora_orm_usage'));
    check('commit convention present', /\[AUR-4471\]|TICKET|MANDATORY/i.test(content));
    check('coverage gate present', content.includes('78'));
    check('design tokens present', content.includes('#0B2545'));
    check('ingested ADR present', content.includes('ADR-021'));

    /* ------------------------------ determinism ------------------------------ */
    console.log('\n\x1b[1m10. Determinism\x1b[0m');
    const again = await client.callTool('synthesize_claude_md');
    const secondPass = fs.readFileSync(manifestPath, 'utf8');
    const normalise = (text: string) => text.replace(/^- \*\*Generated:\*\*.*$/m, '');
    check(
      'regenerating produces identical output (modulo timestamp)',
      normalise(content) === normalise(secondPass),
      `${again.bytes} bytes`
    );

    /* -------------------------------- resources -------------------------------- */
    console.log('\n\x1b[1m11. Resources readable\x1b[0m');
    for (const uri of [
      'bridge://manifest/claude-md',
      'bridge://knowledge/graph',
      'bridge://skills/registry',
      'bridge://conflicts',
      'bridge://runs/latest',
    ]) {
      const read = await client.request('resources/read', { uri });
      const contents = (read.result as { contents?: { text?: string }[] })?.contents;
      check(`read ${uri}`, !!contents?.[0]?.text, `${contents?.[0]?.text?.length ?? 0} chars`);
    }

    /* ------------------------------ PDF ingestion ------------------------------ */
    // Runs after the manifest checks on purpose: ingesting a fifteen-page design
    // document would otherwise dominate the CLAUDE.md the demo shows.
    console.log('\n\x1b[1m12. PDF ingestion\x1b[0m');
    const pdfPath = path.join(ROOT, 'idea.pdf');
    if (fs.existsSync(pdfPath)) {
      const fromPath = await client.callTool('ingest_manual_document', {
        name: 'Architecture blueprint (PDF)',
        file_path: pdfPath,
      });
      check('PDF ingested from a file path', fromPath.ingested === true,
        `${fromPath.pdfPages} pages → ${fromPath.chunks} chunks`);
      check('the text layer was actually extracted', (fromPath.chunks as number) > 5,
        `${(fromPath.document as { chars: number })?.chars} characters of text`);
      check('the document is recognised as a PDF',
        (fromPath.document as { mimeType?: string })?.mimeType === 'application/pdf');

      const pdfSearch = await client.callTool('query_knowledge', {
        query: 'pre-computation swarm reconnaissance personas',
        limit: 5,
      });
      const hits = pdfSearch.results as { title: string }[];
      check('PDF content is searchable in the knowledge base',
        hits.some((h) => /Architecture blueprint/i.test(h.title)),
        `${hits.length} hits`);
    } else {
      check('PDF ingestion (idea.pdf not present — skipped)', true);
    }

    const tasksPdf = path.join(ROOT, 'tasks.pdf');
    if (fs.existsSync(tasksPdf)) {
      // The dashboard dropzone path: bytes, not a server-side path.
      const fromUpload = await client.callTool('ingest_manual_document', {
        name: 'Task list (uploaded)',
        file_base64: fs.readFileSync(tasksPdf).toString('base64'),
      });
      check('PDF ingested from a base64 upload', fromUpload.ingested === true,
        `${fromUpload.pdfPages} pages → ${fromUpload.chunks} chunks`);
    }

    // A binary format with no extractor must say so rather than embed noise.
    let binaryRejected = false;
    try {
      await client.callTool('ingest_manual_document', {
        name: 'A PNG, which is not a document',
        file_base64: fs.readFileSync(path.join(ROOT, 'logo.png')).toString('base64'),
      });
    } catch (error) {
      binaryRejected = /binary file/i.test(String(error));
    }
    check('an unsupported binary upload is rejected with a reason', binaryRejected);
  } catch (error) {
    failed++;
    failures.push(`fatal: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`\n  \x1b[31m✗ FATAL\x1b[0m ${error instanceof Error ? error.stack : String(error)}`);
  } finally {
    client.close();
  }

  await verifySecurity();

  console.log(`\n${'─'.repeat(66)}`);
  if (failed === 0) {
    console.log(`\x1b[32m\x1b[1m  ALL ${passed} CHECKS PASSED\x1b[0m — the demo path works end to end.\n`);
  } else {
    console.log(`\x1b[31m\x1b[1m  ${failed} FAILED\x1b[0m, ${passed} passed\n`);
    for (const failure of failures) console.log(`    · ${failure}`);
    console.log();
  }
  process.exit(failed === 0 ? 0 : 1);
}

void main();
