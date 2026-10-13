import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nitrostack/core';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { randomUUID } from 'crypto';

// Use createRequire for CJS packages (better-sqlite3, socket.io)
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const { Server: SocketIOServer } = require('socket.io');
const jwt = require('jsonwebtoken');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POLICIES_PATH = path.resolve(__dirname, '../../src/data/policies.json');
const DB_PATH = path.resolve(__dirname, '../../audit.db');
const JWT_SECRET = process.env.JWT_SECRET ?? 'ztc-hackathon-secret-2026';
const JWT_EXPIRY = '10m'; // approval tokens expire after 10 minutes

interface Policy {
    name: string;
    level: string;
    requires: string;
    status: 'active' | 'disabled';
    enforced: boolean;
    desc: string;
}

interface PendingIncident {
    service_name: string;
    reason: string;
    commit_hash?: string;
    created_at: string;
}

@Injectable()
export class AuthService implements OnApplicationBootstrap, OnApplicationShutdown {
    private server: http.Server | null = null;
    private io: any = null; // Socket.IO server instance
    private db: any = null; // better-sqlite3 Database

    // In-memory map of incident_id → pending incident details
    private pendingIncidents = new Map<string, PendingIncident>();

    private auditMemory: any[] = []; // fallback if SQLite unavailable
    private usingSqlite = false;

    private initDb() {
        try {
            this.db = new Database(DB_PATH);
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS audit_log (
                    id        INTEGER PRIMARY KEY AUTOINCREMENT,
                    time      TEXT    NOT NULL,
                    event     TEXT    NOT NULL,
                    actor     TEXT    NOT NULL,
                    service   TEXT    NOT NULL,
                    result    TEXT    NOT NULL
                );
            `);
            this.usingSqlite = true;
            console.error('🗄️  SQLite audit database ready:', DB_PATH);
        } catch (e: any) {
            console.error('⚠️  SQLite unavailable, using in-memory fallback:', e.message);
            this.usingSqlite = false;
        }
    }

    private insertAuditRow(event: string, actor: string, service: string, result: string) {
        const time = new Date().toISOString();
        const row = { time, event, actor, service, result };
        try {
            if (this.usingSqlite && this.db) {
                this.db.prepare(
                    'INSERT INTO audit_log (time, event, actor, service, result) VALUES (?, ?, ?, ?, ?)'
                ).run(time, event, actor, service, result);
            } else {
                this.auditMemory.unshift(row);
                if (this.auditMemory.length > 200) this.auditMemory.pop();
            }
        } catch {
            this.auditMemory.unshift(row);
        }
        // Emit to all connected WebSocket clients in real-time
        if (this.io) {
            this.io.emit('audit:new', row);
        }
    }

    /** Called by MCP tools to log activity */
    addAuditEntry(entry: { event: string; actor: string; service: string; result: 'success' | 'error' | 'denied' }) {
        this.insertAuditRow(entry.event, entry.actor, entry.service, entry.result);
    }

    /** Called by execute_rollback tool when entering PENDING_APPROVAL state */
    setPendingIncident(incidentId: string, details: Omit<PendingIncident, 'created_at'>) {
        this.pendingIncidents.set(incidentId, { ...details, created_at: new Date().toISOString() });
        this.insertAuditRow(`Zero-Trust gate activated [${incidentId}]`, 'AI Agent', details.service_name, 'success');
    }

    // ─── JWT Token Helpers ────────────────────────────────────────────────

    private signApprovalToken(incidentId: string, serviceName: string): string {
        return jwt.sign(
            { incident_id: incidentId, service_name: serviceName, authorized_by: 'Admin (Dashboard)', iss: 'zero-trust-commander' },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );
    }

    // In-memory store of valid approval tokens (incident_id → JWT)
    private approvalTokens = new Map<string, string>();

    /** Called by execute_rollback tool to verify a JWT approval */
    verifyAuthorization(incidentId: string): { authorized: boolean; reason?: string; authorizedBy?: string } {
        const token = this.approvalTokens.get(incidentId);
        if (!token) {
            return { authorized: false, reason: 'No approval token found for this incident ID.' };
        }
        try {
            const payload: any = jwt.verify(token, JWT_SECRET);
            this.approvalTokens.delete(incidentId); // one-time use
            this.pendingIncidents.delete(incidentId);
            return { authorized: true, authorizedBy: payload.authorized_by };
        } catch (e: any) {
            this.approvalTokens.delete(incidentId);
            return { authorized: false, reason: `JWT verification failed: ${e.message}` };
        }
    }

    // ─── Policy Helpers ───────────────────────────────────────────────────

    private readPolicies(): Policy[] {
        try { return JSON.parse(fs.readFileSync(POLICIES_PATH, 'utf-8')); } catch { return []; }
    }

    private writePolicies(policies: Policy[]) {
        fs.writeFileSync(POLICIES_PATH, JSON.stringify(policies, null, 2));
    }

    // ─── HTTP utilities ───────────────────────────────────────────────────

    private parseBody(req: http.IncomingMessage): Promise<any> {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON')); } });
        });
    }

    private setCors(res: http.ServerResponse) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    private json(res: http.ServerResponse, data: any, status = 200) {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────

    async onApplicationBootstrap() {
        this.initDb();

        // Create plain HTTP server first
        this.server = http.createServer(async (req, res) => {
            this.setCors(res);
            if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

            const url = req.url ?? '';

            try {
                // ── GET /policies ──────────────────────────────────────
                if (url === '/policies' && req.method === 'GET') {
                    return this.json(res, this.readPolicies());
                }

                // ── PATCH /policies/:name ──────────────────────────────
                if (url.startsWith('/policies/') && req.method === 'PATCH') {
                    const name = decodeURIComponent(url.split('/policies/')[1]);
                    const body = await this.parseBody(req);
                    const policies = this.readPolicies();
                    const idx = policies.findIndex(p => p.name === name);
                    if (idx === -1) return this.json(res, { error: 'Not found' }, 404);
                    policies[idx] = { ...policies[idx], ...body };
                    this.writePolicies(policies);
                    this.insertAuditRow(`Policy updated: ${name}`, 'Admin (Dashboard)', name, 'success');
                    return this.json(res, policies[idx]);
                }

                // ── POST /policies/test ────────────────────────────────
                if (url === '/policies/test' && req.method === 'POST') {
                    const { toolName, simulatedInput } = await this.parseBody(req);
                    const policy = this.readPolicies().find(p => p.name === toolName);
                    if (!policy) return this.json(res, { result: 'no_policy', reason: 'No policy found.' });
                    if (policy.status === 'disabled') {
                        this.insertAuditRow(`${toolName} BLOCKED (policy disabled)`, 'Simulator', simulatedInput ?? '—', 'denied');
                        return this.json(res, { result: 'blocked', reason: 'Policy is disabled. Tool call rejected at gateway.' });
                    }
                    if (!policy.enforced) {
                        this.insertAuditRow(`${toolName} ALLOWED (no enforcement)`, 'Simulator', simulatedInput ?? '—', 'success');
                        return this.json(res, { result: 'allowed', reason: 'No authorization required. Tool call passes through.' });
                    }
                    const hasToken = this.approvalTokens.has(simulatedInput ?? '');
                    const result = hasToken ? 'allowed' : 'blocked';
                    this.insertAuditRow(`${toolName} ${result.toUpperCase()} (enforced gate)`, 'Simulator', simulatedInput ?? '—', hasToken ? 'success' : 'denied');
                    return this.json(res, {
                        result,
                        reason: hasToken
                            ? 'Valid JWT approval token found. Tool call permitted.'
                            : `Unauthorized: ${policy.requires} required. JWT token not present. Request halted by Zero-Trust gate.`
                    });
                }

                // ── GET /audit ─────────────────────────────────────────
                if (url === '/audit' && req.method === 'GET') {
                    const rows = this.usingSqlite && this.db
                        ? this.db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 100').all()
                        : this.auditMemory.slice(0, 100);
                    return this.json(res, rows);
                }

                // ── GET /pending ───────────────────────────────────────
                if (url === '/pending' && req.method === 'GET') {
                    const pending = Array.from(this.pendingIncidents.entries()).map(([id, details]) => ({ incident_id: id, ...details }));
                    return this.json(res, pending);
                }

                // ── GET /prompts ───────────────────────────────────────
                if (url === '/prompts' && req.method === 'GET') {
                    return this.json(res, [
                        { name: 'investigate_incident', tag: 'Production',   args: ['service_name'], description: 'Guided Zero-Trust workflow for investigating and remediating production incidents.' },
                        { name: 'system_health_check',  tag: 'Observability', args: ['environment'],  description: 'Comprehensive health sweep across all registered services.' },
                        { name: 'threat_response',      tag: 'Security',     args: ['pod_name', 'threat_level'], description: 'Automated threat response: quarantine affected pods and alert the security team.' },
                        { name: 'safe_deploy',          tag: 'Deployment',   args: ['service_name', 'image_tag'], description: 'Guarded canary deployment with automated monitoring and human sign-off gate.' },
                    ]);
                }

                // ── POST /run-prompt ───────────────────────────────────
                if (url === '/run-prompt' && req.method === 'POST') {
                    const { promptName, args } = await this.parseBody(req);
                    this.insertAuditRow(`PROMPT QUEUED: ${promptName}`, 'Admin (Dashboard)', Object.values(args ?? {}).join(', ') || '—', 'success');
                    return this.json(res, { success: true, message: `Prompt "${promptName}" has been queued. The AI agent will begin execution shortly.` });
                }

                // ── POST /approve ──────────────────────────────────────
                // Issues a JWT-signed approval token for the given incident_id
                if (url === '/approve' && req.method === 'POST') {
                    const { incident_id, service_name } = await this.parseBody(req);
                    if (!incident_id || !service_name) {
                        return this.json(res, { error: 'Missing incident_id or service_name' }, 400);
                    }
                    const token = this.signApprovalToken(incident_id, service_name);
                    this.approvalTokens.set(incident_id, token);
                    this.pendingIncidents.delete(incident_id);
                    this.insertAuditRow(`execute_rollback APPROVED [${incident_id}]`, 'Admin (Dashboard)', service_name, 'success');
                    return this.json(res, {
                        success: true,
                        message: 'JWT approval token issued.',
                        incident_id,
                        token_expires_in: JWT_EXPIRY,
                        // Expose for demo purposes only — in prod the token stays server-side
                        jwt_preview: token.slice(0, 30) + '…',
                    });
                }

                // ── POST /deny ─────────────────────────────────────────
                if (url === '/deny' && req.method === 'POST') {
                    const { incident_id, service_name } = await this.parseBody(req);
                    if (!incident_id) return this.json(res, { error: 'Missing incident_id' }, 400);
                    this.approvalTokens.delete(incident_id);
                    this.pendingIncidents.delete(incident_id);
                    this.insertAuditRow(`execute_rollback DENIED [${incident_id ?? service_name}]`, 'Admin (Dashboard)', service_name ?? '—', 'denied');
                    return this.json(res, { success: true, message: 'Denied and logged.' });
                }

                res.writeHead(404); res.end('Not found');

            } catch (e: any) {
                console.error('AuthService error:', e.message);
                this.json(res, { error: e.message }, 500);
            }
        });

        // Attach Socket.IO to the same HTTP server
        this.io = new SocketIOServer(this.server, {
            cors: { origin: '*', methods: ['GET', 'POST'] }
        });

        this.io.on('connection', (socket: any) => {
            console.error(`🔌 WebSocket client connected: ${socket.id}`);
            // Send the last 50 audit entries on connection
            try {
                const rows = this.usingSqlite && this.db
                    ? this.db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 50').all().reverse()
                    : [...this.auditMemory].reverse().slice(0, 50);
                socket.emit('audit:history', rows);
            } catch {}
            socket.on('disconnect', () => {
                console.error(`🔌 WebSocket client disconnected: ${socket.id}`);
            });
        });

        this.server.on('error', (e: any) => {
            if (e.code === 'EADDRINUSE') {
                console.error('🔒 AuthService port 3100 already in use.');
            } else {
                console.error('🔒 AuthService error:', e);
            }
        });

        this.server.listen(3100, () => {
            console.error('🔒 Zero-Trust AuthService ready on port 3100 (HTTP + WebSocket + SQLite)');
        });
    }

    async onApplicationShutdown() {
        this.io?.close();
        this.server?.close();
        this.db?.close();
    }
}
