import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './dist/app.module.js';
import { CITools } from './dist/modules/ci/ci.tools.js';

async function test() {
  try {
    const server = await McpApplicationFactory.create(AppModule);
    console.log('Server created.');
    
    // In NitroStack, the tools are registered in the server instance.
    // Let's try to find the tool and execute it.
    // Alternatively, we can just grab the CITools instance from the container (if it exposes it).
    // Let's print out what we can from the server.
    console.log('Tools:', server.getTools ? server.getTools() : 'No getTools method');
    
  } catch (err) {
    console.error('Error starting server:', err);
  }
}

test();
