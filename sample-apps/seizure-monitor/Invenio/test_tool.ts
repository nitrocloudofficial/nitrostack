import 'reflect-metadata';
import { ToolDecorator as Tool, McpApp, Module, McpApplicationFactory } from '@nitrostack/core';
import { z } from 'zod';

class TestController {
  @Tool({
    name: 'test_tool',
    description: 'Test',
    inputSchema: z.any(),
    metadata: { category: 'research-mcp' }
  })
  async test() { return {}; }
}

@Module({ name: 'test', controllers: [TestController] })
class TestModule {}

@McpApp({ module: TestModule, server: { name: 'test' } })
class App {}

async function run() {
  const server = await McpApplicationFactory.create(App);
  console.log("Success!");
  process.exit(0);
}
run();
