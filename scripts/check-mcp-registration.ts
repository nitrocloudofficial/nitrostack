import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from '../src/app.module.js';

async function checkRegistration() {
  console.log('Testing McpApplicationFactory bootstrap to check tool registration...\n');
  try {
    const app = await McpApplicationFactory.create(AppModule);
    console.log('App created successfully!');
    // If there's an internal registry or tools list on app, let's log keys if accessible
    const tools = (app as any).tools || (app as any).registeredTools || (app as any).registry;
    if (tools) {
      console.log('Registered Tools:', Array.isArray(tools) ? tools.map((t: any) => t.name || t) : Object.keys(tools));
    }
  } catch (err: any) {
    console.error('Error during McpApplicationFactory bootstrap:', err);
  }
}

checkRegistration();
