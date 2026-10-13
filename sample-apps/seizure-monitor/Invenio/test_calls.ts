import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './src/app.module.js';

async function run() {
  const server = await McpApplicationFactory.create(AppModule);
  console.log('App successfully instantiated. Found tools:');
  
  // We can see the server's tools
  // But server instance doesn't have an easy tool-listing API publicly in @nitrostack/core
  // we'll just test that we can boot it.
  
  console.log('Server instantiated!');
  process.exit(0);
}
run();
