import { afterEach, describe, expect, it } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Speaks real MCP JSON-RPC to the actual server over stdio and asserts on the
 * real `tools/list` response. This is the test that should have existed from
 * day one: every prior "tool" test exercised the service layer directly
 * (ElasticService, SandboxClient) or asserted on source text, never the real
 * MCP protocol surface — which is how `app.module.ts` using `providers`
 * instead of `controllers` silently made every tool undiscoverable since
 * before Phase 1 even started. See DOUBTS.md for the full story.
 *
 * Runs `tsx src/index.ts` directly (not the built dist/), so this test has no
 * dependency on build ordering and needs no Elasticsearch/Docker — instantiating
 * ElasticService/EmbeddingClient with no credentials configured is a pure,
 * network-free no-op.
 */

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(currentDir, '../..');

// npm workspaces (the monorepo root package.json added for NitroCloud's build)
// can hoist tsx's binary to either mcp/node_modules/.bin or the repo root's,
// depending on what else is installed — check both rather than hardcode one.
function resolveTsxBin(): string {
  const candidates = [
    path.join(projectRoot, 'node_modules/.bin/tsx'),
    path.join(projectRoot, '../node_modules/.bin/tsx'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`Could not resolve the tsx binary; checked: ${candidates.join(', ')}`);
  }
  return found;
}

const tsxBin = resolveTsxBin();
const entryPoint = path.join(projectRoot, 'src/index.ts');

interface JsonRpcMessage {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
}

class McpProbe {
  private child: ChildProcessWithoutNullStreams;
  private buffer = '';
  private pending = new Map<number, (message: JsonRpcMessage) => void>();
  private readyPromise: Promise<void>;

  constructor() {
    this.child = spawn(tsxBin, [entryPoint], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      // Force stdio-only transport (matches how a real MCP client actually
      // invokes this server). Without this, vitest's own NODE_ENV=test leaks
      // into the child and triggers dual stdio+HTTP transport mode, which
      // then fails with EADDRINUSE if anything else holds port 3000.
      env: { ...process.env, ELASTICSEARCH_URL: '', NODE_ENV: 'development' },
    });
    this.child.stdout.on('data', (chunk: Buffer) => this.handleChunk(chunk));

    // Wait for the server's own "started successfully" log, not a guessed
    // delay — writing to stdin before the stdio transport actually starts
    // reading loses the write (the process only starts reading stdin once
    // its transport is attached, which happens after tsx's cold-start
    // compilation and the app's async bootstrap).
    this.readyPromise = new Promise((resolve) => {
      let stderrBuffer = '';
      const onStderr = (chunk: Buffer) => {
        stderrBuffer += chunk.toString();
        if (stderrBuffer.includes('started successfully')) {
          this.child.stderr.off('data', onStderr);
          resolve();
        }
      };
      this.child.stderr.on('data', onStderr);
    });
  }

  private handleChunk(chunk: Buffer): void {
    this.buffer += chunk.toString();
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (!line) continue;
      let message: JsonRpcMessage;
      try {
        message = JSON.parse(line);
      } catch {
        continue; // banner/log noise, not JSON-RPC
      }
      if (typeof message.id === 'number') {
        this.pending.get(message.id)?.(message);
        this.pending.delete(message.id);
      }
    }
  }

  private request(id: number, method: string, params: unknown = {}): Promise<JsonRpcMessage> {
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }

  async initialize(): Promise<JsonRpcMessage> {
    await this.readyPromise;
    const result = await this.request(1, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'mcp-protocol-test', version: '0.0.1' },
    });
    this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    return result;
  }

  listTools(): Promise<JsonRpcMessage> {
    return this.request(2, 'tools/list');
  }

  close(): void {
    this.child.kill();
  }
}

describe('MCP protocol: real tool discovery', () => {
  let probe: McpProbe | undefined;

  afterEach(() => {
    probe?.close();
    probe = undefined;
  });

  it('exposes exactly the binding six-tool contract via a real tools/list call', async () => {
    probe = new McpProbe();
    const initResult = await probe.initialize();
    expect(initResult.result).toBeDefined();

    const toolsResult = await probe.listTools();
    const tools = (toolsResult.result as { tools: Array<{ name: string }> }).tools;
    const names = tools.map((tool) => tool.name).sort();

    // Phase 3: verify_fix/submit_fix join the registered set now that the
    // real trust chain (Checkpoints 2-4) exists — see DECISIONS.md Decision 009.
    expect(names).toEqual([
      'find_similar',
      'get_execution_log',
      'get_patch',
      'search_fix',
      'submit_fix',
      'verify_fix',
    ]);
    // Not part of the binding six-tool contract (PROJECT.md) — removed from discovery.
    expect(names).not.toContain('search_by_error');
  }, 15000);
});
