import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './dist/app.module.js';

async function test() {
  try {
    const server = await McpApplicationFactory.create(AppModule);
    console.log('Server created.');
    
    // In NitroStack, server exposes getTools() if we cast it appropriately or use its private properties.
    // Let's use reflection to find the Tool instance and invoke it.
    const ciModule = server.modules?.find(m => m.name === 'ci');
    if (!ciModule) {
       console.log('CI module not found in server');
       return;
    }
    
    const tool = ciModule.tools?.find(t => t.name === 'get_ci_graphrag_context');
    if (!tool) {
       console.log('Tool not found');
       return;
    }
    
    console.log('Executing tool...');
    try {
      const result = await tool.execute({ owner: 'foo', repo: 'bar', run_id: '123' }, {});
      console.log('Tool executed successfully. Result length:', result.length);
    } catch (e) {
      console.error('Tool execution threw error:', e.message);
    }
  } catch (err) {
    console.error('Error starting server:', err);
  }
}

test();
