import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

// Bootstrap the Meeting Supervisor MCP server.
McpApplicationFactory.create(AppModule);
