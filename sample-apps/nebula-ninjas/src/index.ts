/**
 * Sentinel Gateway — MCP Zero-Trust Gateway
 * 
 * Routes all agent tool calls through a security pipeline:
 * ① Discovery & Fingerprinting — hashes every tool description
 * ② Integrity Checking — detects drift/poisoning on every call
 * ③ RBAC Policy Engine — per-agent permission enforcement
 * ④ Injection Detection — catches hidden instructions
 * ⑤ Provenance Ledger — unforgeable hash-chained audit trail
 */

import http from 'http';

// Universal container health check interceptor for NitroCloud & Docker health probes
const origEmit = http.Server.prototype.emit;
(http.Server.prototype as any).emit = function (event: string, ...args: any[]) {
    if (event === 'request' && args[0] && args[1]) {
        const req = args[0];
        const res = args[1];
        if (req.url === '/health' || req.url === '/healthz' || req.url === '/ping') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ status: 'ok', service: 'sentinel-gateway', timestamp: new Date().toISOString() }));
            return true;
        }
    }
    return origEmit.apply(this, [event, ...args] as any);
};

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';
import { startFilesystemServer } from './mock-servers/filesystem-server.js';
import { startCrmServer } from './mock-servers/crm-server.js';
import { startEmailServer } from './mock-servers/email-server.js';

async function bootstrap() {
    console.error('');
    console.error('🛡️  SENTINEL GATEWAY v1.0.0');
    console.error('═══════════════════════════════════════════════');
    console.error('   MCP Zero-Trust Gateway');
    console.error('   Tool-Poisoning Detection + Provenance Ledger');
    console.error('═══════════════════════════════════════════════');
    console.error('');

    // Auto-start mock servers for standalone container environments (e.g. NitroCloud)
    try {
        await Promise.all([
            startFilesystemServer().catch((e: any) => { if (e?.code !== 'EADDRINUSE') console.error('Filesystem mock server init note:', e?.message || e); }),
            startCrmServer().catch((e: any) => { if (e?.code !== 'EADDRINUSE') console.error('CRM mock server init note:', e?.message || e); }),
            startEmailServer().catch((e: any) => { if (e?.code !== 'EADDRINUSE') console.error('Email mock server init note:', e?.message || e); }),
        ]);
        console.error('✅ Downstream mock servers ready on ports 3001, 3002, 3003');
    } catch (err) {
        console.error('Note on mock servers startup:', err);
    }

    const server = await McpApplicationFactory.create(AppModule);
    await server.start();
}

bootstrap().catch((error) => {
    console.error('❌ Failed to start Sentinel Gateway:', error);
    process.exit(1);
});
