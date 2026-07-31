/**
 * MCP JSON-RPC Transport Client — Aegis Protocol
 *
 * Simulates the JSON-RPC 2.0 message envelope protocol that MCP
 * uses for tool invocations between agents and MCP servers.
 *
 * In a production deployment, these messages would traverse real
 * network boundaries (stdio/SSE/WebSocket). Here we simulate the
 * wire format to demonstrate protocol compliance while resolving
 * tool calls against local mock data.
 *
 * Wire Format (JSON-RPC 2.0):
 *   Request:  { jsonrpc: "2.0", id: <number>, method: "tools/call", params: { name, arguments } }
 *   Response: { jsonrpc: "2.0", id: <number>, result: { content: [...] } }
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────
// JSON-RPC Types
// ─────────────────────────────────────────────────────────────

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: {
    content: Array<{ type: string; text: string }>;
  };
  error?: {
    code: number;
    message: string;
  };
}

// ─────────────────────────────────────────────────────────────
// MCP JSON-RPC Client
// ─────────────────────────────────────────────────────────────

export class McpJsonRpcClient {
  private requestId: number = 0;
  private transportLog: Array<{ request: JsonRpcRequest; response: JsonRpcResponse }> = [];

  /**
   * Invoke a tool on a target MCP server via JSON-RPC 2.0.
   *
   * @param server  - Target MCP server identifier (e.g. 'telecom_airgapped_mcp')
   * @param method  - Tool name to invoke (e.g. 'analyze_telecom_metadata')
   * @param params  - Tool input arguments
   * @returns       - Parsed tool result
   */
  async invoke<T = Record<string, any>>(
    server: string,
    method: string,
    params: Record<string, unknown>
  ): Promise<T> {
    this.requestId++;
    const id = this.requestId;

    // ── Build JSON-RPC Request ──
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: {
        name: method,
        arguments: params,
      },
    };

    console.error('');
    console.error(`  📤 [JSON-RPC → ${server}] Request #${id}`);
    console.error(`     Method: tools/call`);
    console.error(`     Tool:   ${method}`);
    console.error(`     Params: ${JSON.stringify(params)}`);

    try {
      // ── Resolve tool call against local data ──
      const result = await this.resolveToolCall(server, method, params);

      // ── Build JSON-RPC Response ──
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        },
      };

      console.error(`  📥 [JSON-RPC ← ${server}] Response #${id}`);
      console.error(`     Status: OK`);
      console.error(`     Result: ${JSON.stringify(result).substring(0, 120)}...`);
      console.error('');

      // Track in transport log
      this.transportLog.push({ request, response });

      return result as T;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      const errorResponse: JsonRpcResponse = {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message,
        },
      };

      console.error(`  ❌ [JSON-RPC ← ${server}] Error #${id}: ${message}`);

      this.transportLog.push({ request, response: errorResponse });
      throw error;
    }
  }

  /**
   * Get the full JSON-RPC transport log for audit/debugging.
   */
  getTransportLog(): Array<{ request: JsonRpcRequest; response: JsonRpcResponse }> {
    return [...this.transportLog];
  }

  /**
   * Get current request ID counter.
   */
  getRequestCount(): number {
    return this.requestId;
  }

  // ─────────────────────────────────────────────────────────────
  // Private: Resolve tool calls against local mock data
  // ─────────────────────────────────────────────────────────────

  private async resolveToolCall(
    server: string,
    method: string,
    params: Record<string, unknown>
  ): Promise<Record<string, any>> {
    // Try test_cases.json first for scenario-specific data
    const testCase = this.findTestCase(params);

    switch (method) {
      case 'analyze_telecom_metadata': {
        if (testCase?.telecom) return testCase.telecom;
        const mockPath = path.resolve(process.cwd(), 'mocks', 'telecom_event.json');
        return JSON.parse(fs.readFileSync(mockPath, 'utf-8'));
      }

      case 'verify_voice_deepfake': {
        if (testCase?.voice) {
          return {
            ai_synthesis_probability: testCase.voice.ai_synthesis_probability ?? 0.94,
            voice_clone_detected: (testCase.voice.ai_synthesis_probability ?? 0.94) > 0.5,
          };
        }
        return {
          ai_synthesis_probability: 0.94,
          voice_clone_detected: true,
        };
      }

      case 'query_mule_graph': {
        if (testCase?.bank) return testCase.bank;
        const mockPath = path.resolve(process.cwd(), 'mocks', 'bank_event.json');
        return JSON.parse(fs.readFileSync(mockPath, 'utf-8'));
      }

      case 'dispatch_mha_alert': {
        console.log('MHA ALERT GENERATED');
        return {
          status: 200,
          mha_case_id: `NCRB-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        };
      }

      default:
        throw new Error(`Unknown tool method: ${method} on server ${server}`);
    }
  }

  private findTestCase(params: Record<string, unknown>): any {
    try {
      const suitePath = path.resolve(process.cwd(), 'mocks', 'test_cases.json');
      if (!fs.existsSync(suitePath)) return null;

      const suite = JSON.parse(fs.readFileSync(suitePath, 'utf-8'));
      const queryValues = Object.values(params).filter((v) => typeof v === 'string') as string[];

      for (const q of queryValues) {
        const matched = suite.find(
          (c: any) =>
            c.senderPhone === q ||
            c.destinationAccount === q ||
            c.id === q ||
            c.bank?.destination_account === q ||
            c.bank?.transaction_id === q ||
            c.telecom?.target_phone === q ||
            c.telecom?.call_id === q ||
            c.telecom?.incoming_caller_id === q
        );
        if (matched) return matched;
      }

      return suite[0];
    } catch {
      return null;
    }
  }
}
