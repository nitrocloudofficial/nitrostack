/**
 * Personal Finance & Tax Copilot — MCP Server (NitroStack)
 *
 * Exposes four real-data financial modules and an agentic "copilot" that
 * orchestrates them into one coherent answer:
 *
 *   1. tax        — old vs new regime income-tax calculator (FY 2025-26 slabs)
 *   2. funds      — mutual fund NAV / returns / XIRR via the free MFAPI.in API
 *   3. bank       — IFSC / bank branch verification via the free Razorpay API
 *   4. compliance — Indian tax & filing due-date calendar
 *   5. copilot    — orchestrates the above for a full "plan my finances" workflow
 *
 * All external data is LIVE and keyless — nothing is mocked.
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

// Keep the server alive on unexpected errors instead of exiting. Without these,
// a single unhandled rejection (e.g. a slow upstream fetch inside a resource read)
// terminates the process and the client sees "MCP server closed connection (EOF)".
process.on('unhandledRejection', (reason) => {
    console.error('⚠️  Unhandled promise rejection (server kept alive):', reason);
});
process.on('uncaughtException', (error) => {
    console.error('⚠️  Uncaught exception (server kept alive):', error);
});

async function bootstrap() {
    const server = await McpApplicationFactory.create(AppModule);
    await server.start();
}

bootstrap().catch((error) => {
    console.error('❌ Failed to start Finance Copilot server:', error);
    process.exit(1);
});
