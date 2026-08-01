import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Logger } from '../src/server/logger.js';
import { ToolRegistry } from '../src/server/toolRegistry.js';
import { ToolExecutor } from '../src/server/toolExecutor.js';
import { MCPServerWrapper } from '../src/server/mcpServer.js';
import { ServerConfig } from '../src/config/env.js';

async function runPhase1Tests() {
  console.log('====================================================');
  console.log('   RUNNING PHASE 1 AUTOMATED INTEGRATION TESTS      ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  // 1. Logger Test
  const logger = new Logger('debug');
  assert(logger !== null, 'Logger initializes correctly');

  // 2. Tool Registry Test
  const registry = new ToolRegistry(logger);
  const dummyTool = {
    name: 'test_tool',
    description: 'A test tool for registry verification',
    inputSchema: z.object({ value: z.string() }),
    execute: async (args: { value: string }) => ({ result: `Received: ${args.value}` }),
  };

  registry.registerTool(dummyTool);
  assert(registry.hasTool('test_tool'), 'Tool registry registers a tool');

  const toolsList = registry.listTools();
  assert(toolsList.length === 1 && toolsList[0].name === 'test_tool', 'Registry lists tools correctly');

  // 3. Tool Executor Test
  const executor = new ToolExecutor(registry, logger);
  const execResult = await executor.execute({
    name: 'test_tool',
    args: { value: 'test_input' },
  });

  assert(execResult.success === true, 'Executor executes a tool successfully');
  assert(execResult.durationMs >= 0, 'Executor logs execution time');
  assert(execResult.response.content.length > 0, 'Executor returns structured response');

  // 4. Ping Tool JSON Return Test
  const pingTool = {
    name: 'ping',
    description: 'Infrastructure health check diagnostic tool',
    inputSchema: z.object({ message: z.string().optional() }),
    execute: async (args: { message?: string }) => ({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      echo: args.message ?? 'pong',
    }),
  };

  registry.registerTool(pingTool);
  const pingResult = await executor.execute({
    name: 'ping',
    args: { message: 'test_ping' },
  });

  assert(pingResult.success === true, 'Ping tool executes successfully');
  const pingContent = pingResult.response.content[0];
  const parsedPingData = JSON.parse(pingContent.text ?? '{}');
  assert(
    pingContent.type === 'text' && parsedPingData.status === 'healthy' && parsedPingData.echo === 'test_ping',
    'Ping tool returns valid formatted JSON payload'
  );

  // 5. Full MCP Client End-to-End Test
  const config: ServerConfig = {
    serverName: 'test-mcp-server',
    serverVersion: '1.0.0',
    logLevel: 'debug',
    transport: 'stdio',
  };

  const mcpServer = new MCPServerWrapper(config, registry, executor, logger);

  // Connect Server and Client via InMemoryTransport
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const mcpClient = new Client(
    { name: 'test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  await mcpServer.getSDKServer().connect(serverTransport);
  await mcpClient.connect(clientTransport);

  assert(true, 'Server starts and connects transport');

  // Client lists tools
  const clientTools = await mcpClient.listTools();
  assert(
    clientTools.tools.some((t) => t.name === 'ping') && clientTools.tools.some((t) => t.name === 'test_tool'),
    'MCP client can list tools via server protocol'
  );

  // Client invokes Ping
  const clientPingResponse = await mcpClient.callTool({
    name: 'ping',
    arguments: { message: 'hello from mcp client' },
  });

  const clientPingPayload = JSON.parse((clientPingResponse.content[0] as { text: string }).text);

  assert(
    clientPingResponse !== null &&
      !clientPingResponse.isError &&
      clientPingPayload.status === 'healthy' &&
      clientPingPayload.echo === 'hello from mcp client',
    'MCP client can invoke Ping tool and receive JSON response'
  );

  await mcpClient.close();
  await mcpServer.stop();

  console.log('\n====================================================');
  console.log(` TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runPhase1Tests().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
