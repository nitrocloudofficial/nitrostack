import { startStdioMCPServer } from './server/index.js';

process.on('uncaughtException', (error) => {
  console.error('[MCP Uncaught Exception]', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[MCP Unhandled Rejection]', reason);
});

process.on('SIGINT', () => {
  console.error('[MCP Server] Interrupted by SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[MCP Server] Terminated by SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

startStdioMCPServer().catch((err) => {
  console.error('[MCP Fatal Startup Error]', err);
  process.exit(1);
});
