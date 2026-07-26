import 'reflect-metadata';
import { ToolDecorator as Tool, z, McpApplicationFactory, Module, McpApp } from '@nitrostack/core';

class TestTools {
  constructor() {
    this.message = "Hello from instance";
  }

  @Tool({
    name: 'test_arrow',
    description: 'Test arrow function',
    inputSchema: z.object({})
  })
  testArrow = async (args) => {
    return this.message;
  }

  @Tool({
    name: 'test_method',
    description: 'Test normal method',
    inputSchema: z.object({})
  })
  async testMethod(args) {
    return this.message; // this will probably throw
  }
}

@Module({
  name: 'test',
  controllers: [TestTools]
})
class TestModule {}

@McpApp({ module: TestModule, server: { name: 'test', version: '1' } })
class App {}

async function run() {
  try {
    const server = await McpApplicationFactory.create(App);
    const mod = server.modules.find(m => m.name === 'test');
    
    for (const tool of mod.tools) {
       console.log(`Executing ${tool.name}...`);
       try {
         const res = await tool.execute({}, {});
         console.log(`Result: ${res}`);
       } catch (e) {
         console.error(`Error: ${e.message}`);
       }
    }
  } catch (e) {
    console.error('Startup error:', e);
  }
}

run();
