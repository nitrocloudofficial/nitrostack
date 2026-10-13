/**
 * Mock Server Launcher
 * 
 * Starts all 3 mock MCP servers for Sentinel Gateway demos.
 * Run with: npx tsx src/mock-servers/start.ts
 */

import { startFilesystemServer } from './filesystem-server.js';
import { startCrmServer } from './crm-server.js';
import { startEmailServer } from './email-server.js';

async function startAll() {
  console.error('');
  console.error('🚀 Starting Sentinel Gateway Mock Servers...');
  console.error('═══════════════════════════════════════════════');

  await Promise.all([
    startFilesystemServer(),
    startCrmServer(),
    startEmailServer(),
  ]);

  console.error('═══════════════════════════════════════════════');
  console.error('✅ All mock servers are running!');
  console.error('');
  console.error('   📁 Filesystem: http://localhost:3001');
  console.error('   👥 CRM:        http://localhost:3002');
  console.error('   📧 Email:      http://localhost:3003');
  console.error('');
  console.error('Press Ctrl+C to stop all servers.');
}

startAll().catch((err) => {
  console.error('❌ Failed to start mock servers:', err);
  process.exit(1);
});
